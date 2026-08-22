import { beforeEach, describe, expect, it } from 'vitest';
import { resetStorage } from '../../apps/mobile/src/services/asyncStorage.js';
import { AuditLogger } from '../../apps/mobile/src/services/auditLogger.js';

describe('Audit Logger & Telemetry Security', () => {
  let logger: AuditLogger;

  beforeEach(async () => {
    await resetStorage();
    logger = new AuditLogger();
  });

  it('records structured audit events with timestamps and event IDs', async () => {
    const event = await logger.log('MESSAGE_CREATED', 'MTR-172432-8F2B', { priority: 'HIGH_URGENT' });

    expect(event.id).toMatch(/^evt_/);
    expect(event.eventType).toBe('MESSAGE_CREATED');
    expect(event.trackingId).toBe('MTR-172432-8F2B');
    expect(event.timestamp).toBeDefined();
    expect(event.metadata?.priority).toBe('HIGH_URGENT');

    const events = logger.getEvents('MTR-172432-8F2B');
    expect(events.length).toBe(1);
  });

  it('STRICTLY SANITIZES and redacts plaintext message bodies, secrets, and keys', async () => {
    await logger.log('MESSAGE_CREATED', 'MTR-172432-8F2B', {
      payload: 'SOS: critical patient at Sector 1',
      plaintext: 'Unencrypted confidential message',
      secretKey: 'TOP_SECRET_PASSPHRASE_123',
      passphrase: 'MY_SECRET_PASSPHRASE',
      phone: '+919876543210',
      safeDiagnostics: 'Latency 20ms',
    });

    const [loggedEvent] = logger.getEvents('MTR-172432-8F2B');
    expect(loggedEvent).toBeDefined();

    const metadata = loggedEvent.metadata!;
    expect(metadata.payload).toBe('[REDACTED_SENSITIVE_DATA]');
    expect(metadata.plaintext).toBe('[REDACTED_SENSITIVE_DATA]');
    expect(metadata.secretKey).toBe('[REDACTED_SENSITIVE_DATA]');
    expect(metadata.passphrase).toBe('[REDACTED_SENSITIVE_DATA]');
    expect(metadata.phone).toBe('+91****210'); // Phone masked
    expect(metadata.safeDiagnostics).toBe('Latency 20ms'); // Safe diagnostic preserved
  });

  it('persists and reloads audit trail across restarts', async () => {
    await logger.log('SYNC_STARTED', undefined, { count: 5 });
    await logger.log('SYNC_SUCCEEDED', undefined, { count: 5 });

    const newLogger = new AuditLogger();
    await newLogger.loadPersisted();

    const events = newLogger.getEvents();
    expect(events.length).toBe(2);
    expect(events[0].eventType).toBe('SYNC_STARTED');
    expect(events[1].eventType).toBe('SYNC_SUCCEEDED');
  });
});
