import { describe, expect, it } from 'vitest';
import { EmergencyMessage } from '@mobiletrust/shared';
import {
  calculateTotalStorageUsage,
  enforceStorageBudget,
  estimateMessageSize,
  getStorageStats,
  pruneOldMessages,
} from '../../apps/mobile/src/services/storageBudget.js';

describe('Storage Budget & LRU Pruning Service', () => {
  // Helper to create synthetic messages with configurable payload size
  function createSyntheticMessage(
    id: string,
    status: EmergencyMessage['status'],
    dateStr: string,
    payloadSizeChars: number = 100
  ): EmergencyMessage {
    return {
      id,
      recipient: '+919876543210',
      payload: 'X'.repeat(payloadSizeChars),
      isEncrypted: false,
      priority: 'STANDARD',
      status,
      retryCount: 0,
      maxRetries: 3,
      createdAt: dateStr,
      updatedAt: dateStr,
      deliveredAt: status === 'DELIVERED' ? dateStr : undefined,
    };
  }

  it('estimates individual message byte size accurately', () => {
    const msg = createSyntheticMessage('MTR-111111-AAAA', 'QUEUED_OFFLINE', '2026-08-22T10:00:00.000Z', 500);
    const size = estimateMessageSize(msg);
    expect(size).toBeGreaterThan(500);
    expect(size).toBeLessThan(1000);
  });

  it('calculates aggregate storage statistics correctly', () => {
    const messages: EmergencyMessage[] = [
      createSyntheticMessage('MTR-111111-AAAA', 'DELIVERED', '2026-08-22T08:00:00.000Z'),
      createSyntheticMessage('MTR-222222-BBBB', 'SENT', '2026-08-22T09:00:00.000Z'),
    ];

    const stats = getStorageStats(messages);
    expect(stats.messageCount).toBe(2);
    expect(stats.totalBytes).toBeGreaterThan(0);
    expect(stats.oldestMessageTimestamp).toBe('2026-08-22T08:00:00.000Z');
    expect(stats.isOverLimit).toBe(false);
    expect(stats.isOverThreshold).toBe(false);
  });

  it('prunes old DELIVERED messages in LRU order when budget threshold is exceeded', () => {
    // Create 5 delivered messages with distinct timestamps
    const m1 = createSyntheticMessage('MTR-111111-AAAA', 'DELIVERED', '2026-08-20T10:00:00.000Z', 1000); // oldest
    const m2 = createSyntheticMessage('MTR-222222-BBBB', 'DELIVERED', '2026-08-21T10:00:00.000Z', 1000);
    const m3 = createSyntheticMessage('MTR-333333-CCCC', 'DELIVERED', '2026-08-22T10:00:00.000Z', 1000);
    const m4 = createSyntheticMessage('MTR-444444-DDDD', 'DELIVERED', '2026-08-23T10:00:00.000Z', 1000);
    const m5 = createSyntheticMessage('MTR-555555-EEEE', 'DELIVERED', '2026-08-24T10:00:00.000Z', 1000); // newest

    const allMessages = [m1, m2, m3, m4, m5];
    const totalBytes = calculateTotalStorageUsage(allMessages);

    // Target a budget that fits only roughly 2 messages
    const targetBudget = Math.floor(totalBytes * 0.45);
    const result = pruneOldMessages(allMessages, targetBudget);

    expect(result.removedCount).toBeGreaterThanOrEqual(2);
    expect(result.finalBytes).toBeLessThanOrEqual(targetBudget);

    // The oldest messages (m1, m2) should be removed first, while m5 and m4 are retained
    const retainedIds = result.retainedMessages.map((m) => m.id);
    expect(retainedIds).not.toContain(m1.id);
    expect(retainedIds).toContain(m5.id);
  });

  it('PROTECTS pending, queued, and failed messages from being pruned', () => {
    const queued = createSyntheticMessage('MTR-111111-AAAA', 'QUEUED_OFFLINE', '2026-08-20T08:00:00.000Z', 2000);
    const sent = createSyntheticMessage('MTR-222222-BBBB', 'SENT', '2026-08-20T09:00:00.000Z', 2000);
    const failed = createSyntheticMessage('MTR-333333-CCCC', 'FAILED', '2026-08-20T10:00:00.000Z', 2000);
    const delivered = createSyntheticMessage('MTR-444444-DDDD', 'DELIVERED', '2026-08-20T11:00:00.000Z', 2000);

    const allMessages = [queued, sent, failed, delivered];

    // Set a very restrictive target budget
    const result = pruneOldMessages(allMessages, 3000);

    const retainedIds = result.retainedMessages.map((m) => m.id);
    expect(retainedIds).toContain(queued.id);
    expect(retainedIds).toContain(sent.id);
    expect(retainedIds).toContain(failed.id);
    // Only the delivered message was prunable
    expect(retainedIds).not.toContain(delivered.id);
  });

  it('enforceStorageBudget leaves messages untouched when below threshold', () => {
    const messages = [createSyntheticMessage('MTR-111111-AAAA', 'DELIVERED', '2026-08-22T10:00:00.000Z')];
    const { messages: result, pruned } = enforceStorageBudget(messages, 100000);

    expect(pruned).toBe(false);
    expect(result.length).toBe(1);
  });
});
