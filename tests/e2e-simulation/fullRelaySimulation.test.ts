import { beforeEach, describe, expect, it } from 'vitest';
import { resetStorage } from '../../apps/mobile/src/services/asyncStorage.js';
import { AuditLogger } from '../../apps/mobile/src/services/auditLogger.js';
import { NetworkMonitor } from '../../apps/mobile/src/services/networkMonitor.js';
import { RelayClient } from '../../apps/mobile/src/services/relayClient.js';
import { SyncEngine } from '../../apps/mobile/src/services/syncEngine.js';
import { MessageStore } from '../../apps/mobile/src/store/messageStore.js';

describe('End-to-End Relay Lifecycle Simulation', () => {
  let store: MessageStore;
  let network: NetworkMonitor;
  let relay: RelayClient;
  let logger: AuditLogger;
  let syncEngine: SyncEngine;

  beforeEach(async () => {
    await resetStorage();
    store = new MessageStore();
    network = new NetworkMonitor(false); // Begin in disaster zone (Offline)
    relay = new RelayClient();
    logger = new AuditLogger();
    syncEngine = new SyncEngine(store, network, relay, logger);
  });

  it('Happy Path: Offline Creation -> Network Reconnect -> Cloud Relay -> Carrier DELIVRD -> Store DELIVERED', async () => {
    // 1. Responder creates emergency message while disconnected in the field
    const msg = await syncEngine.createMessage({
      recipient: '+919876543210',
      payload: 'Camp Delta: Medical supplies delivered safely.',
      priority: 'HIGH_URGENT',
    });

    const initialTrackingId = msg.id;
    expect(msg.status).toBe('QUEUED_OFFLINE');

    // Verify persisted in store
    expect(store.getMessage(initialTrackingId)?.status).toBe('QUEUED_OFFLINE');

    // 2. Cell tower / satellite reconnects
    network.setOnline(true);

    // 3. Mock Cloud Relay with Carrier DELIVRD receipt
    relay.setMockReceipt(initialTrackingId, {
      trackingId: initialTrackingId,
      recipient: msg.recipient,
      carrierStatus: 'DELIVRD',
      carrierTimestamp: '2026-08-22T10:15:00.000Z',
    });

    // 4. Synchronize
    const syncResult = await syncEngine.syncQueue();

    expect(syncResult.success).toBe(true);
    expect(syncResult.syncedCount).toBe(1);

    // 5. Verify local store state updated to DELIVERED
    const finalMsg = store.getMessage(initialTrackingId);
    expect(finalMsg).toBeDefined();
    expect(finalMsg?.status).toBe('DELIVERED');
    expect(finalMsg?.deliveredAt).toBe('2026-08-22T10:15:00.000Z');
    // Verify tracking ID remained identical through the full lifecycle
    expect(finalMsg?.id).toBe(initialTrackingId);
  });

  it('Temporary Dropout Recovery: Retry 1 -> Retry 2 -> Cloud Delivery -> DELIVERED', async () => {
    network.setOnline(true);

    const msg = await syncEngine.createMessage({
      recipient: '+919876543210',
      payload: 'Helicopter evacuation landing at Point Bravo',
    });

    const trackingId = msg.id;

    // Simulate Network Failure during Sync 1
    relay.setMockHandler(async () => {
      throw new Error('504 Gateway Timeout');
    });

    const attempt1 = await syncEngine.syncQueue();
    expect(attempt1.success).toBe(false);
    expect(store.getMessage(trackingId)?.retryCount).toBe(1);

    // Simulate Network Failure during Sync 2
    const attempt2 = await syncEngine.syncQueue();
    expect(attempt2.success).toBe(false);
    expect(store.getMessage(trackingId)?.retryCount).toBe(2);

    // Network recovers, Carrier DELIVRD receipt arrives
    relay.clearMockReceipts();
    relay.setMockReceipt(trackingId, {
      trackingId,
      recipient: msg.recipient,
      carrierStatus: 'DELIVRD',
      carrierTimestamp: '2026-08-22T10:20:00.000Z',
    });

    const attempt3 = await syncEngine.syncQueue();
    expect(attempt3.success).toBe(true);
    expect(store.getMessage(trackingId)?.status).toBe('DELIVERED');
    expect(store.getMessage(trackingId)?.id).toBe(trackingId);
  });

  it('Fatal Dropout: Retry 1 -> Retry 2 -> Retry 3 -> FAILED with failureReason', async () => {
    network.setOnline(true);

    const msg = await syncEngine.createMessage({
      recipient: '+919876543210',
      payload: 'URGENT: Flooding reported in sector 9',
    });

    const trackingId = msg.id;

    // Always fail
    relay.setMockHandler(async () => {
      throw new Error('500 Internal Cloud Error');
    });

    await syncEngine.syncQueue(); // Retry 1
    expect(store.getMessage(trackingId)?.retryCount).toBe(1);

    await syncEngine.syncQueue(); // Retry 2
    expect(store.getMessage(trackingId)?.retryCount).toBe(2);

    await syncEngine.syncQueue(); // Retry 3 (Fatal)
    const failedMsg = store.getMessage(trackingId);
    expect(failedMsg?.retryCount).toBe(3);
    expect(failedMsg?.status).toBe('FAILED');
    expect(failedMsg?.failureReason).toContain('Sync failed after 3 retries');
    expect(failedMsg?.id).toBe(trackingId);
  });

  it('Carrier Undelivered: Receipt UNDELIV -> Marked as FAILED', async () => {
    network.setOnline(true);

    const msg = await syncEngine.createMessage({
      recipient: '+919876543210',
      payload: 'Test delivery failure handling',
    });

    const trackingId = msg.id;

    relay.setMockReceipt(trackingId, {
      trackingId,
      recipient: msg.recipient,
      carrierStatus: 'UNDELIV',
      carrierTimestamp: '2026-08-22T10:30:00.000Z',
      networkErrorCode: 'ERR_ROUTING_FAILED',
    });

    const syncResult = await syncEngine.syncQueue();
    expect(syncResult.success).toBe(true);

    const finalMsg = store.getMessage(trackingId);
    expect(finalMsg?.status).toBe('FAILED');
    expect(finalMsg?.failureReason).toContain('ERR_ROUTING_FAILED');
    expect(finalMsg?.id).toBe(trackingId);
  });
});
