import {
  CarrierStatus,
  DeliveryStatus,
  EmergencyMessage,
  MAX_RETRIES,
  MessagePriority,
  SYNC_BACKOFF_BASE_MS,
  SYNC_BACKOFF_MAX_MS,
  SYNC_JITTER_FACTOR,
  SyncError,
  SyncResult,
} from '@mobiletrust/shared';
import { generateTrackingId } from '../crypto/hash';
import { MessageStore, messageStore } from '../store/messageStore';
import { AuditLogger, auditLogger } from './auditLogger';
import { NetworkMonitor, networkMonitor } from './networkMonitor';
import { RelayClient, relayClient } from './relayClient';

export interface CreateMessageOptions {
  recipient: string;
  payload: string;
  isEncrypted?: boolean;
  priority?: MessagePriority;
  customTrackingId?: string;
}

export class SyncEngine {
  private store: MessageStore;
  private network: NetworkMonitor;
  private relay: RelayClient;
  private logger: AuditLogger;
  private isSyncing: boolean = false;
  private unsubscribeNetwork: (() => void) | null = null;

  constructor(
    store: MessageStore = messageStore,
    network: NetworkMonitor = networkMonitor,
    relay: RelayClient = relayClient,
    logger: AuditLogger = auditLogger
  ) {
    this.store = store;
    this.network = network;
    this.relay = relay;
    this.logger = logger;
  }

  /**
   * Starts the sync engine, subscribing to network transitions.
   */
  start(): void {
    if (this.unsubscribeNetwork) return;

    this.unsubscribeNetwork = this.network.subscribe(async (isOnline) => {
      if (isOnline) {
        await this.logger.log('NETWORK_ONLINE');
        await this.syncQueue();
      } else {
        await this.logger.log('NETWORK_OFFLINE');
      }
    });

    // If already online, initiate initial sync
    if (this.network.isOnline()) {
      this.syncQueue().catch((err) => {
        console.error('Initial sync failed:', err);
      });
    }
  }

  /**
   * Stops the sync engine and cleans up network listeners.
   */
  stop(): void {
    if (this.unsubscribeNetwork) {
      this.unsubscribeNetwork();
      this.unsubscribeNetwork = null;
    }
  }

  /**
   * Calculates exponential backoff delay with randomized jitter.
   *
   * Formula:
   * baseDelay = min(SYNC_BACKOFF_MAX_MS, SYNC_BACKOFF_BASE_MS * 2^(retryCount - 1))
   * jitter = Math.random() * (SYNC_BACKOFF_BASE_MS * SYNC_JITTER_FACTOR)
   * total = baseDelay + jitter
   */
  calculateBackoffDelay(retryCount: number, randomJitter: number = Math.random()): number {
    const exponent = Math.max(0, retryCount - 1);
    const exponential = SYNC_BACKOFF_BASE_MS * Math.pow(2, exponent);
    const baseDelay = Math.min(SYNC_BACKOFF_MAX_MS, exponential);
    const jitter = randomJitter * (SYNC_BACKOFF_BASE_MS * SYNC_JITTER_FACTOR);
    return Math.floor(baseDelay + jitter);
  }

  /**
   * Creates a new emergency message.
   * If offline, persists it immediately with QUEUED_OFFLINE status.
   */
  async createMessage(options: CreateMessageOptions): Promise<EmergencyMessage> {
    const trackingId = options.customTrackingId || generateTrackingId();
    const now = new Date().toISOString();

    const isOnline = this.network.isOnline();
    const status: DeliveryStatus = isOnline ? 'SENT' : 'QUEUED_OFFLINE';

    const message: EmergencyMessage = {
      id: trackingId,
      recipient: options.recipient,
      payload: options.payload,
      isEncrypted: Boolean(options.isEncrypted),
      priority: options.priority || 'STANDARD',
      status,
      retryCount: 0,
      maxRetries: MAX_RETRIES,
      createdAt: now,
      updatedAt: now,
    };

    await this.store.addMessage(message);

    if (status === 'QUEUED_OFFLINE') {
      await this.logger.log('MESSAGE_QUEUED_OFFLINE', trackingId, {
        priority: message.priority,
        isEncrypted: message.isEncrypted,
      });
    } else {
      await this.logger.log('SMS_DISPATCHED', trackingId, {
        priority: message.priority,
      });
    }

    return message;
  }

  /**
   * Synchronizes pending messages with the Cloud Relay.
   * Handles offline batching, carrier receipt reconciliation, and exponential retry handling.
   */
  async syncQueue(): Promise<SyncResult> {
    if (this.isSyncing) {
      // Prevent concurrent duplicate synchronization
      return {
        success: true,
        syncedCount: 0,
        failedCount: 0,
        updatedIds: [],
        errors: [],
      };
    }

    if (!this.network.isOnline()) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        updatedIds: [],
        errors: [{ trackingId: 'ALL', error: 'Network is offline', retryable: true }],
      };
    }

    this.isSyncing = true;
    const pendingMessages = this.store.getPendingMessages();

    if (pendingMessages.length === 0) {
      this.isSyncing = false;
      return {
        success: true,
        syncedCount: 0,
        failedCount: 0,
        updatedIds: [],
        errors: [],
      };
    }

    await this.logger.log('SYNC_STARTED', undefined, { pendingCount: pendingMessages.length });

    const trackingIds = pendingMessages.map((m) => m.id);
    const updatedIds: string[] = [];
    const errors: SyncError[] = [];
    let syncedCount = 0;
    let failedCount = 0;

    try {
      // Query Cloud Relay for batch carrier receipt statuses
      const batchResponse = await this.relay.getBatchStatus(trackingIds);

      for (const msg of pendingMessages) {
        const receipt = batchResponse.statuses[msg.id];

        if (receipt) {
          await this.reconcileCarrierReceipt(msg, receipt);
          updatedIds.push(msg.id);
          syncedCount++;
        } else {
          // If message is QUEUED_OFFLINE, transition to SENT as network is now active
          if (msg.status === 'QUEUED_OFFLINE') {
            await this.store.updateMessage(msg.id, {
              status: 'SENT',
            });
            await this.logger.log('SMS_DISPATCHED', msg.id);
            updatedIds.push(msg.id);
          }
        }
      }

      await this.logger.log('SYNC_SUCCEEDED', undefined, { syncedCount, updatedCount: updatedIds.length });
    } catch (err: unknown) {
      // Network or cloud error during sync: apply retry policy to all pending messages
      const errorMessage = err instanceof Error ? err.message : String(err);
      await this.logger.log('SYNC_FAILED', undefined, { error: errorMessage });

      for (const msg of pendingMessages) {
        const newRetry = msg.retryCount + 1;
        errors.push({
          trackingId: msg.id,
          error: errorMessage,
          retryable: newRetry < MAX_RETRIES,
        });

        if (newRetry >= MAX_RETRIES) {
          // Retry limit exhausted -> Mark FAILED
          await this.store.updateMessage(msg.id, {
            status: 'FAILED',
            retryCount: MAX_RETRIES,
            failureReason: `Sync failed after ${MAX_RETRIES} retries: ${errorMessage}`,
          });
          await this.logger.log('RETRY_EXHAUSTED', msg.id, { retries: MAX_RETRIES });
          await this.logger.log('MESSAGE_FAILED', msg.id, { reason: errorMessage });
          failedCount++;
          updatedIds.push(msg.id);
        } else {
          // Increment retry count
          await this.store.updateMessage(msg.id, {
            retryCount: newRetry,
          });
          await this.logger.log('RETRY_STARTED', msg.id, {
            retryCount: newRetry,
            nextDelayMs: this.calculateBackoffDelay(newRetry),
          });
        }
      }
    } finally {
      this.isSyncing = false;
    }

    return {
      success: errors.length === 0,
      syncedCount,
      failedCount,
      updatedIds,
      errors,
    };
  }

  /**
   * Reconciles a single carrier receipt with local message state.
   */
  private async reconcileCarrierReceipt(
    message: EmergencyMessage,
    receipt: { carrierStatus: CarrierStatus; carrierTimestamp: string; networkErrorCode?: string | null }
  ): Promise<void> {
    await this.logger.log('CARRIER_STATUS_UPDATED', message.id, {
      carrierStatus: receipt.carrierStatus,
      networkErrorCode: receipt.networkErrorCode,
    });

    if (receipt.carrierStatus === 'DELIVRD') {
      await this.store.markDelivered(message.id, receipt.carrierTimestamp);
      await this.logger.log('MESSAGE_DELIVERED', message.id, {
        deliveredAt: receipt.carrierTimestamp,
      });
    } else if (receipt.carrierStatus === 'UNDELIV' || receipt.carrierStatus === 'EXPIRED') {
      const reason = `Carrier status: ${receipt.carrierStatus}${
        receipt.networkErrorCode ? ` (Error: ${receipt.networkErrorCode})` : ''
      }`;
      await this.store.markFailed(message.id, reason);
      await this.logger.log('MESSAGE_FAILED', message.id, { reason });
    } else if (receipt.carrierStatus === 'ACCEPTD') {
      if (message.status !== 'SENT') {
        await this.store.updateMessage(message.id, { status: 'SENT' });
      }
    }
  }
}

// Global default instance
export const syncEngine = new SyncEngine();
