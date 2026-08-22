import { describe, expect, it, beforeEach } from 'vitest';
import { messageStore } from '../../apps/mobile/src/store/messageStore';
import { EmergencyMessage } from '@mobiletrust/shared';

describe('Mobile UI State & Status Transitions', () => {
  beforeEach(async () => {
    await messageStore.clear();
  });

  it('allows updating messages with FAILED_CARRIER and RELAYED_CLOUD statuses without throwing Zod errors', async () => {
    const msg: EmergencyMessage = {
      id: 'MTR-111111-AAAA',
      recipient: '+919876543210',
      payload: 'Emergency evacuation test',
      content: 'Emergency evacuation test',
      status: 'QUEUED_OFFLINE',
      priority: 'HIGH_URGENT',
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timestampCreated: Date.now(),
    };

    await messageStore.addMessage(msg);
    expect(messageStore.getMessage(msg.id)?.status).toBe('QUEUED_OFFLINE');

    // Update to FAILED_CARRIER
    await messageStore.updateMessage(msg.id, {
      status: 'FAILED_CARRIER',
      retryCount: 3,
      failureReason: 'Carrier transmission error',
    });
    expect(messageStore.getMessage(msg.id)?.status).toBe('FAILED_CARRIER');

    // Update to RELAYED_CLOUD
    await messageStore.updateMessage(msg.id, {
      status: 'RELAYED_CLOUD',
    });
    expect(messageStore.getMessage(msg.id)?.status).toBe('RELAYED_CLOUD');

    // Update to DELIVERED
    await messageStore.markDelivered(msg.id);
    expect(messageStore.getMessage(msg.id)?.status).toBe('DELIVERED');
  });

  it('marks critical dropout and persists failureReason', async () => {
    const msg: EmergencyMessage = {
      id: 'MTR-222222-BBBB',
      recipient: '+919876543210',
      payload: 'Flash flood alert',
      content: 'Flash flood alert',
      status: 'FAILED',
      priority: 'HIGH_URGENT',
      retryCount: 3,
      maxRetries: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timestampCreated: Date.now(),
    };

    await messageStore.addMessage(msg);
    await messageStore.updateMessage(msg.id, {
      status: 'FAILED',
      failureReason: 'Critical Dropout: Recipient unreachable after 3 attempts',
      retryCount: 3,
    });

    const updated = messageStore.getMessage(msg.id);
    expect(updated?.status).toBe('FAILED');
    expect(updated?.failureReason).toContain('Critical Dropout');
    expect(updated?.retryCount).toBe(3);
  });
});
