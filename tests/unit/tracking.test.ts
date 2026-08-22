import { describe, expect, it } from 'vitest';
import { TRACKING_ID_REGEX, SMS_MAX_LENGTH } from '@mobiletrust/shared';
import { generateTrackingId } from '../../apps/mobile/src/crypto/hash.js';

describe('Tracking ID Generation & SMS Budget', () => {
  it('generates tracking IDs matching the canonical MTR format', () => {
    const id = generateTrackingId();
    expect(id).toMatch(TRACKING_ID_REGEX);
    expect(id.startsWith('MTR-')).toBe(true);
  });

  it('generates IDs with exact length 15 characters (e.g., MTR-172432-8F2B)', () => {
    const id = generateTrackingId();
    // MTR- (4) + 6 digits (6) + - (1) + 4 hex (4) = 15 characters
    expect(id.length).toBe(15);
  });

  it('preserves SMS budget: tracking ID occupies < 10% of standard 160-char SMS', () => {
    const id = generateTrackingId();
    const availableSmsChars = SMS_MAX_LENGTH - id.length - 1; // 1 space separator
    expect(availableSmsChars).toBe(144);
    expect(id.length).toBeLessThan(SMS_MAX_LENGTH * 0.1);
  });

  it('generates unique tracking IDs across rapid sequential invocations', () => {
    const ids = new Set<string>();
    const count = 200;

    for (let i = 0; i < count; i++) {
      const id = generateTrackingId();
      expect(id).toMatch(TRACKING_ID_REGEX);
      ids.add(id);
    }

    // In a single timestamp millisecond, the 2-byte random hex allows 65536 combinations
    expect(ids.size).toBe(count);
  });
});
