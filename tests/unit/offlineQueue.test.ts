import { beforeEach, describe, expect, it } from 'vitest';
import { resetStorage } from '../../apps/mobile/src/services/asyncStorage.js';
import { AuditLogger } from '../../apps/mobile/src/services/auditLogger.js';
import { NetworkMonitor } from '../../apps/mobile/src/services/networkMonitor.js';
import { RelayClient } from '../../apps/mobile/src/services/relayClient.js';
import { SyncEngine } from '../../apps/mobile/src/services/syncEngine.js';
import { MessageStore } from '../../apps/mobile/src/store/messageStore.js';

describe('Offline Queue & Application Restart Resilience', () => {
  let store: MessageStore;
  let network: NetworkMonitor;
  let relay: RelayClient;
  let logger: AuditLogger;
  let syncEngine: SyncEngine;

  beforeEach(async () => {
    await resetStorage();
    store = new MessageStore();
    network = new NetworkMonitor(false); // Start OFFLINE
    relay = new RelayClient();
    logger = new AuditLogger();
    syncEngine = new SyncEngine(store, network, relay, logger);
  });

  it('creates and queues emergency message as QUEUED_OFFLINE when network is disconnected', async () => {
    const msg = await syncEngine.createMessage({
      recipient: '+919876543210',
      payload: 'Camp Alpha: supplies critically low',
      priority: 'HIGH_URGENT',
    });

    expect(msg.status).toBe('QUEUED_OFFLINE');
    expect(msg.retryCount).toBe(0);
    expect(msg.id).toMatch(/^MTR-\d{6}-[A-F0-9]{4}$/);

    const storedMsg = store.getMessage(msg.id);
    expect(storedMsg).toBeDefined();
    expect(storedMsg?.status).toBe('QUEUED_OFFLINE');
  });

  it('persists queued message through simulated app termination and restart', async () => {
    // 1. Create message while offline
    const originalMsg = await syncEngine.createMessage({
      recipient: '+919876543210',
      payload: 'Bridge collapsed at Sector 3',
      priority: 'HIGH_URGENT',
    });

    // 2. Simulate complete app restart by creating a new MessageStore instance and reloading from storage
    const restartedStore = new MessageStore();
    await restartedStore.loadPersisted();

    const recoveredMsg = restartedStore.getMessage(originalMsg.id);
    expect(recoveredMsg).toBeDefined();
    expect(recoveredMsg?.id).toBe(originalMsg.id);
    expect(recoveredMsg?.payload).toBe('Bridge collapsed at Sector 3');
    expect(recoveredMsg?.status).toBe('QUEUED_OFFLINE');
    expect(recoveredMsg?.priority).toBe('HIGH_URGENT');
  });

  it('automatically triggers queue synchronization when network comes back ONLINE', async () => {
    syncEngine.start();

    // Create 2 offline messages
    const msg1 = await syncEngine.createMessage({
      recipient: '+919876543210',
      payload: 'Urgent medical assistance required',
    });
    const msg2 = await syncEngine.createMessage({
      recipient: '+919876543211',
      payload: 'Evacuation boat arrived',
    });

    expect(store.getPendingMessages().length).toBe(2);

    // Mock carrier delivering msg1
    relay.setMockReceipt(msg1.id, {
      trackingId: msg1.id,
      recipient: msg1.recipient,
      carrierStatus: 'DELIVRD',
      carrierTimestamp: new Date().toISOString(),
    });

    // Simulate Network Reconnect: OFFLINE -> ONLINE
    network.setOnline(true);

    // Allow sync to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(store.getMessage(msg1.id)?.status).toBe('DELIVERED');
    expect(store.getMessage(msg2.id)?.status).toBe('SENT');

    syncEngine.stop();
  });
});
