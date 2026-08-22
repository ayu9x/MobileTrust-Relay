import { describe, expect, it } from 'vitest';
import {
  decryptPayload,
  DecryptionError,
  encryptPayload,
} from '../../apps/mobile/src/crypto/cipher.js';
import { generateHmac, verifyHmac } from '../../apps/mobile/src/crypto/hash.js';

describe('Cryptography & Security Module', () => {
  const samplePlaintext = 'SOS: 5 casualties reported at coordinate 28.6139, 77.2090. Need air support.';
  const samplePassphrase = 'RESCOPS-2026-KEY-SECRET-99';
  const wrongPassphrase = 'WRONG-RESCOPS-KEY-9999999';

  describe('Authenticated AES-256-GCM Encryption & Decryption', () => {
    it('successfully encrypts plaintext and decrypts back to original message', async () => {
      const encrypted = await encryptPayload(samplePlaintext, samplePassphrase);

      expect(encrypted).toBeDefined();
      expect(encrypted.version).toBe(1);
      expect(encrypted.algorithm).toBe('AES-GCM-256');
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.tag).toBeDefined();

      const decrypted = await decryptPayload(encrypted, samplePassphrase);
      expect(decrypted).toBe(samplePlaintext);
    });

    it('generates a distinct random IV for every encryption invocation', async () => {
      const enc1 = await encryptPayload(samplePlaintext, samplePassphrase);
      const enc2 = await encryptPayload(samplePlaintext, samplePassphrase);

      expect(enc1.iv).not.toBe(enc2.iv);
      expect(enc1.ciphertext).not.toBe(enc2.ciphertext);

      // Both should still decrypt to the exact same plaintext
      expect(await decryptPayload(enc1, samplePassphrase)).toBe(samplePlaintext);
      expect(await decryptPayload(enc2, samplePassphrase)).toBe(samplePlaintext);
    });

    it('rejects decryption when given a wrong key/passphrase', async () => {
      const encrypted = await encryptPayload(samplePlaintext, samplePassphrase);

      await expect(decryptPayload(encrypted, wrongPassphrase)).rejects.toThrow(DecryptionError);
    });

    it('detects tampering with ciphertext and throws DecryptionError', async () => {
      const encrypted = await encryptPayload(samplePlaintext, samplePassphrase);

      // Tamper with the ciphertext by flipping characters
      const tamperedBytes = Buffer.from(encrypted.ciphertext, 'base64');
      tamperedBytes[0] ^= 0xff;
      const tamperedPayload = {
        ...encrypted,
        ciphertext: tamperedBytes.toString('base64'),
      };

      await expect(decryptPayload(tamperedPayload, samplePassphrase)).rejects.toThrow(DecryptionError);
    });

    it('detects tampering with IV and throws DecryptionError', async () => {
      const encrypted = await encryptPayload(samplePlaintext, samplePassphrase);

      const tamperedIvBytes = Buffer.from(encrypted.iv, 'base64');
      tamperedIvBytes[0] ^= 0x01;
      const tamperedPayload = {
        ...encrypted,
        iv: tamperedIvBytes.toString('base64'),
      };

      await expect(decryptPayload(tamperedPayload, samplePassphrase)).rejects.toThrow(DecryptionError);
    });

    it('detects tampering with authentication tag and throws DecryptionError', async () => {
      const encrypted = await encryptPayload(samplePlaintext, samplePassphrase);

      const tamperedTagBytes = Buffer.from(encrypted.tag, 'base64');
      tamperedTagBytes[0] ^= 0xaa;
      const tamperedPayload = {
        ...encrypted,
        tag: tamperedTagBytes.toString('base64'),
      };

      await expect(decryptPayload(tamperedPayload, samplePassphrase)).rejects.toThrow(DecryptionError);
    });

    it('safely handles empty payloads or empty keys without crashing', async () => {
      await expect(encryptPayload('', samplePassphrase)).rejects.toThrow(DecryptionError);
      await expect(encryptPayload(samplePlaintext, '')).rejects.toThrow(DecryptionError);
      await expect(encryptPayload(samplePlaintext, '   ')).rejects.toThrow(DecryptionError);
    });
  });

  describe('HMAC Integrity Hashing', () => {
    it('generates deterministic HMAC for the same input and secret key', async () => {
      const hmac1 = await generateHmac('MTR-172432-8F2B:DELIVRD', 'HMAC-SECRET-123');
      const hmac2 = await generateHmac('MTR-172432-8F2B:DELIVRD', 'HMAC-SECRET-123');
      expect(hmac1).toBe(hmac2);
      expect(hmac1.length).toBe(64); // SHA-256 hex length
    });

    it('verifies valid HMAC and rejects tampered data or wrong secret', async () => {
      const data = 'MTR-172432-8F2B:DELIVRD';
      const secret = 'HMAC-SECRET-123';
      const hmac = await generateHmac(data, secret);

      expect(await verifyHmac(data, hmac, secret)).toBe(true);
      expect(await verifyHmac('MTR-172432-8F2B:UNDELIV', hmac, secret)).toBe(false);
      expect(await verifyHmac(data, hmac, 'WRONG-SECRET')).toBe(false);
      expect(await verifyHmac(data, '0000000000000000000000000000000000000000000000000000000000000000', secret)).toBe(false);
    });
  });
});
