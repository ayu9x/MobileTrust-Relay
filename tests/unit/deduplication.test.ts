import { describe, expect, it } from 'vitest';
import { generateContentHash, normalizeMessage } from '../../apps/mobile/src/crypto/hash.js';

describe('Message Deduplication Content Hash (Person 2 Contract)', () => {
  const recipient = '+919876543210';
  const baseTimestamp = 1724320000000; // Base reference timestamp

  it('normalizes internal and boundary whitespace correctly', () => {
    const raw = '   URGENT:   Flood water rising in   Ward 12   ';
    expect(normalizeMessage(raw)).toBe('URGENT: Flood water rising in Ward 12');
  });

  it('produces identical content hash for identical recipient, normalized body, and 5-min bucket', async () => {
    const msg1 = 'Emergency medical evacuation needed at Sector 5';
    const msg2 = '  Emergency   medical   evacuation   needed at Sector 5  ';

    const hash1 = await generateContentHash(recipient, msg1, baseTimestamp);
    const hash2 = await generateContentHash(recipient, msg2, baseTimestamp);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex
  });

  it('produces identical content hash within the same 5-minute window', async () => {
    const msg = 'Rescue team deployed';
    const t0 = baseTimestamp;
    const t1 = baseTimestamp + 2 * 60 * 1000; // 2 minutes later (same bucket)

    const hash0 = await generateContentHash(recipient, msg, t0);
    const hash1 = await generateContentHash(recipient, msg, t1);

    expect(hash0).toBe(hash1);
  });

  it('produces different content hash across different 5-minute windows', async () => {
    const msg = 'Rescue team deployed';
    const t0 = baseTimestamp;
    const tNextBucket = baseTimestamp + 6 * 60 * 1000; // 6 minutes later (different bucket)

    const hash0 = await generateContentHash(recipient, msg, t0);
    const hashNext = await generateContentHash(recipient, msg, tNextBucket);

    expect(hash0).not.toBe(hashNext);
  });

  it('produces different content hashes for different recipients', async () => {
    const msg = 'Evacuate immediately';
    const hashA = await generateContentHash('+919876543210', msg, baseTimestamp);
    const hashB = await generateContentHash('+919876543211', msg, baseTimestamp);

    expect(hashA).not.toBe(hashB);
  });

  it('produces different content hashes for different message content', async () => {
    const hashA = await generateContentHash(recipient, 'Evacuate north', baseTimestamp);
    const hashB = await generateContentHash(recipient, 'Evacuate south', baseTimestamp);

    expect(hashA).not.toBe(hashB);
  });
});
