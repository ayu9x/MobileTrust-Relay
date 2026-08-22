import {
  EmergencyMessage,
  StorageStats,
  STORAGE_LIMIT_BYTES,
  STORAGE_PRUNE_THRESHOLD_BYTES,
  STORAGE_TARGET_BYTES,
} from '@mobiletrust/shared';

/**
 * Estimates the byte size of a single emergency message when serialized to JSON.
 */
export function estimateMessageSize(message: EmergencyMessage): number {
  if (!message) return 0;
  try {
    const jsonStr = JSON.stringify(message);
    return new TextEncoder().encode(jsonStr).length;
  } catch {
    return 0;
  }
}

/**
 * Calculates the total storage size in bytes for an array of emergency messages.
 */
export function calculateTotalStorageUsage(messages: EmergencyMessage[]): number {
  return messages.reduce((total, msg) => total + estimateMessageSize(msg), 0);
}

/**
 * Generates comprehensive storage statistics for the given message list.
 */
export function getStorageStats(messages: EmergencyMessage[]): StorageStats {
  const totalBytes = calculateTotalStorageUsage(messages);
  const isOverLimit = totalBytes > STORAGE_LIMIT_BYTES;
  const isOverThreshold = totalBytes > STORAGE_PRUNE_THRESHOLD_BYTES;

  let oldestMessageTimestamp: string | undefined = undefined;
  if (messages.length > 0) {
    const sorted = [...messages].sort(
      (a, b) => new Date(a.createdAt || a.timestampCreated || 0).getTime() - new Date(b.createdAt || b.timestampCreated || 0).getTime()
    );
    oldestMessageTimestamp = sorted[0]?.createdAt || (sorted[0]?.timestampCreated ? new Date(sorted[0].timestampCreated!).toISOString() : undefined);
  }

  return {
    totalBytes,
    messageCount: messages.length,
    limitBytes: STORAGE_LIMIT_BYTES,
    pruneThresholdBytes: STORAGE_PRUNE_THRESHOLD_BYTES,
    isOverLimit,
    isOverThreshold,
    oldestMessageTimestamp,
  };
}

export interface PruneResult {
  retainedMessages: EmergencyMessage[];
  removedCount: number;
  bytesFreed: number;
  initialBytes: number;
  finalBytes: number;
}

/**
 * Prunes messages using an LRU strategy to bring storage under the target budget.
 *
 * Rules:
 * 1. PROTECT all 'QUEUED_OFFLINE', 'SENT', and 'FAILED' messages — never prune them.
 * 2. Only prune 'DELIVERED' messages, starting from the oldest delivery timestamp.
 * 3. Stop pruning as soon as total storage is below targetBytes.
 *
 * @param messages The current list of messages
 * @param targetBytes The desired target storage in bytes (defaults to STORAGE_TARGET_BYTES)
 * @returns Result object containing the retained messages and stats on freed memory
 */
export function pruneOldMessages(
  messages: EmergencyMessage[],
  targetBytes: number = STORAGE_TARGET_BYTES
): PruneResult {
  const initialBytes = calculateTotalStorageUsage(messages);

  if (initialBytes <= targetBytes) {
    return {
      retainedMessages: [...messages],
      removedCount: 0,
      bytesFreed: 0,
      initialBytes,
      finalBytes: initialBytes,
    };
  }

  // Partition into protected messages (active, queued, failed) vs prunable (delivered)
  const protectedMessages: EmergencyMessage[] = [];
  const prunableDeliveredMessages: EmergencyMessage[] = [];

  for (const msg of messages) {
    if (msg.status === 'DELIVERED') {
      prunableDeliveredMessages.push(msg);
    } else {
      protectedMessages.push(msg);
    }
  }

  // Sort delivered messages ascending by deliveredAt (or createdAt) -> Oldest first
  prunableDeliveredMessages.sort((a, b) => {
    const timeA = new Date(a.deliveredAt || a.createdAt || a.timestampDelivered || a.timestampCreated || 0).getTime();
    const timeB = new Date(b.deliveredAt || b.createdAt || b.timestampDelivered || b.timestampCreated || 0).getTime();
    return timeA - timeB;
  });

  const retainedDelivered: EmergencyMessage[] = [];
  let currentBytes = calculateTotalStorageUsage(protectedMessages);

  // Add back delivered messages from newest to oldest until budget is reached
  const reversedDelivered = [...prunableDeliveredMessages].reverse(); // Newest first
  for (const msg of reversedDelivered) {
    const msgSize = estimateMessageSize(msg);
    if (currentBytes + msgSize <= targetBytes) {
      retainedDelivered.unshift(msg);
      currentBytes += msgSize;
    }
  }

  const retainedMessages = [...protectedMessages, ...retainedDelivered];
  const finalBytes = calculateTotalStorageUsage(retainedMessages);
  const removedCount = messages.length - retainedMessages.length;
  const bytesFreed = initialBytes - finalBytes;

  return {
    retainedMessages,
    removedCount,
    bytesFreed,
    initialBytes,
    finalBytes,
  };
}

/**
 * Enforces the storage budget: if storage exceeds threshold, automatically prunes old delivered messages.
 */
export function enforceStorageBudget(
  messages: EmergencyMessage[],
  thresholdBytes: number = STORAGE_PRUNE_THRESHOLD_BYTES,
  targetBytes: number = STORAGE_TARGET_BYTES
): {
  messages: EmergencyMessage[];
  pruned: boolean;
  stats: StorageStats;
} {
  const currentBytes = calculateTotalStorageUsage(messages);

  if (currentBytes > thresholdBytes) {
    const result = pruneOldMessages(messages, targetBytes);
    return {
      messages: result.retainedMessages,
      pruned: true,
      stats: getStorageStats(result.retainedMessages),
    };
  }

  return {
    messages,
    pruned: false,
    stats: getStorageStats(messages),
  };
}
