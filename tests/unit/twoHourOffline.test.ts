import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OFFLINE_QUEUE_MAX_MS } from '@mobiletrust/shared';
import { resetStorage } from '../../apps/mobile/src/services/asyncStorage.js';
import { AuditLogger } from '../../apps/mobile/src/services/auditLogger.js';
import { NetworkMonitor } from '../../apps/mobile/src/services/networkMonitor.js';
import { RelayClient } from '../../apps/mobile/src/services/relayClient.js';
import { SyncEngine } from '../../apps/mobile/src/services/syncEngine.js';
import { MessageStore } from '../../apps/mobile/src/store/messageStore.js';

describe('2-Hour Offline Support Simulation (Fake Timers)', () => {
  let store: MessageStore;
  let network: NetworkMonitor;
  let relay: RelayClient;
  let logger: AuditLogger;
  let syncEngine: SyncEngine;

  beforeEach(async () => {
    vi.useFakeTimers();
    await resetStorage();
    store = new MessageStore();
    network = new NetworkMonitor(false); // Offline
    relay = new RelayClient();
    logger = new AuditLogger();
    syncEngine = new SyncEngine(store, network, relay, logger);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('guarantees zero data loss after 2 hours in offline mode and synchronizes upon reconnect', async () => {
    syncEngine.start();

    // 1. Create emergency messages at t = 0 (Offline)
    const msg1 = await syncEngine.createMessage({
      recipient: '+919876543210',
      payload: 'Hour 0: Disaster strikes, network lost. Team mobilizing.',
      priority: 'HIGH_URGENT',
    });

    // 2. Advance time by 1 hour (3,600,000 ms)
    vi.advanceTimersByTime(3600000);

    // Create another message at t = 1 hour
    const msg2 = await syncEngine.createMessage({
      recipient: '+919876543211',
      payload: 'Hour 1: Temporary shelter established at High School.',
      priority: 'STANDARD',
    });

    // 3. Advance time by another 1 hour (total 2 hours = 7,200,000 ms offline)
    vi.advanceTimersByTime(3600000);

    expect(OFFLINE_QUEUE_MAX_MS).toBe(7200000);

    // 4. Simulate app restarts during the offline window
    const reloadedStore = new MessageStore();
    await reloadedStore.loadPersisted();

    const stored1 = reloadedStore.getMessage(msg1.id);
    const stored2 = reloadedStore.getMessage(msg2.id);

    expect(stored1).toBeDefined();
    expect(stored1?.status).toBe('QUEUED_OFFLINE');
    expect(stored1?.payload).toBe('Hour 0: Disaster strikes, network lost. Team mobilizing.');

    expect(stored2).toBeDefined();
    expect(stored2?.status).toBe('QUEUED_OFFLINE');
    expect(stored2?.payload).toBe('Hour 1: Temporary shelter established at High School.');

    // 5. At t = 2 hours + 5 minutes, reconnect network
    vi.advanceTimersByTime(300000);

    // Prepare mock carrier receipt for msg1
    relay.setMockReceipt(msg1.id, {
      trackingId: msg1.id,
      recipient: msg1.recipient,
      carrierStatus: 'DELIVRD',
      carrierTimestamp: new Date().toISOString(),
    });

    const activeSync = new SyncEngine(reloadedStore, network, relay, logger);
    network.setOnline(true);

    const syncResult = await activeSync.syncQueue();

    expect(syncResult.success).toBe(true);
    expect(syncResult.syncedCount).toBe(1);

    // Msg1 was delivered by carrier, Msg2 was sent out
    expect(reloadedStore.getMessage(msg1.id)?.status).toBe('DELIVERED');
    expect(reloadedStore.getMessage(msg2.id)?.status).toBe('SENT');

    syncEngine.stop();
  });
});
