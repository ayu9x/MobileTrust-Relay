import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_RETRIES, SYNC_BACKOFF_BASE_MS, SYNC_BACKOFF_MAX_MS } from '@mobiletrust/shared';
import { resetStorage } from '../../apps/mobile/src/services/asyncStorage.js';
import { AuditLogger } from '../../apps/mobile/src/services/auditLogger.js';
import { NetworkMonitor } from '../../apps/mobile/src/services/networkMonitor.js';
import { RelayClient } from '../../apps/mobile/src/services/relayClient.js';
import { SyncEngine } from '../../apps/mobile/src/services/syncEngine.js';
import { MessageStore } from '../../apps/mobile/src/store/messageStore.js';

describe('Retry Policy, Exponential Backoff & 3-Retry Failure Handling', () => {
  let store: MessageStore;
  let network: NetworkMonitor;
  let relay: RelayClient;
  let logger: AuditLogger;
  let syncEngine: SyncEngine;

  beforeEach(async () => {
    await resetStorage();
    store = new MessageStore();
    network = new NetworkMonitor(true); // Online
    relay = new RelayClient();
    logger = new AuditLogger();
    syncEngine = new SyncEngine(store, network, relay, logger);
  });

  describe('Exponential Backoff & Jitter Calculation', () => {
    it('calculates exponential backoff correctly for attempts 1, 2, and 3', () => {
      // Without jitter (jitter = 0)
      expect(syncEngine.calculateBackoffDelay(1, 0)).toBe(1000); // 1000 * 2^0 = 1000ms
      expect(syncEngine.calculateBackoffDelay(2, 0)).toBe(2000); // 1000 * 2^1 = 2000ms
      expect(syncEngine.calculateBackoffDelay(3, 0)).toBe(4000); // 1000 * 2^2 = 4000ms
      expect(syncEngine.calculateBackoffDelay(4, 0)).toBe(8000); // 1000 * 2^3 = 8000ms
    });

    it('caps backoff delay at SYNC_BACKOFF_MAX_MS', () => {
      const largeRetryDelay = syncEngine.calculateBackoffDelay(10, 0);
      expect(largeRetryDelay).toBe(SYNC_BACKOFF_MAX_MS);
    });

    it('adds bounded randomized jitter within expected range', () => {
      const delayMinJitter = syncEngine.calculateBackoffDelay(1, 0);
      const delayMaxJitter = syncEngine.calculateBackoffDelay(1, 1.0);

      expect(delayMinJitter).toBe(SYNC_BACKOFF_BASE_MS);
      expect(delayMaxJitter).toBe(SYNC_BACKOFF_BASE_MS + SYNC_BACKOFF_BASE_MS * 0.5); // 1500ms
    });
  });

  describe('3-Retry Failure Handling and State Transitions', () => {
    it('exhausts retries on 3 consecutive failures and marks message as FAILED', async () => {
      // Create a message
      const msg = await syncEngine.createMessage({
        recipient: '+919876543210',
        payload: 'Supply convoy ambushed',
      });

      // Configure relay mock to consistently fail
      relay.setMockHandler(async () => {
        throw new Error('503 Service Unavailable: Relay Network Down');
      });

      // Attempt 1
      const result1 = await syncEngine.syncQueue();
      expect(result1.success).toBe(false);
      let current = store.getMessage(msg.id);
      expect(current?.retryCount).toBe(1);
      expect(current?.status).toBe('SENT');

      // Attempt 2
      const result2 = await syncEngine.syncQueue();
      expect(result2.success).toBe(false);
      current = store.getMessage(msg.id);
      expect(current?.retryCount).toBe(2);
      expect(current?.status).toBe('SENT');

      // Attempt 3 (Final attempt)
      const result3 = await syncEngine.syncQueue();
      expect(result3.success).toBe(false);
      current = store.getMessage(msg.id);
      expect(current?.retryCount).toBe(MAX_RETRIES);
      expect(current?.status).toBe('FAILED');
      expect(current?.failureReason).toContain('Sync failed after 3 retries');

      // Attempt 4 should not retry this message as it is no longer pending (it is FAILED)
      expect(store.getPendingMessages().length).toBe(0);
      const result4 = await syncEngine.syncQueue();
      expect(result4.syncedCount).toBe(0);
      expect(result4.failedCount).toBe(0);
    });
  });
});
