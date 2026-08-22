import { EncryptedPayload } from '@mobiletrust/shared';

/**
 * Custom error thrown when payload decryption or authentication fails.
 */
export class DecryptionError extends Error {
  constructor(message: string = 'Decryption failed: payload corrupted, tampered, or invalid key') {
    super(message);
    this.name = 'DecryptionError';
  }
}

/**
 * Helper to convert Uint8Array / ArrayBuffer to Base64
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return globalThis.btoa(binary);
}

/**
 * Helper to convert Base64 string to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derives a secure 256-bit CryptoKey for AES-GCM from a key or passphrase using SHA-256.
 */
async function deriveAesKey(keyOrPassphrase: string): Promise<CryptoKey> {
  if (!keyOrPassphrase || typeof keyOrPassphrase !== 'string' || keyOrPassphrase.trim().length === 0) {
    throw new DecryptionError('Invalid encryption key: key material cannot be empty');
  }

  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(keyOrPassphrase);
  const keyHash = await globalThis.crypto.subtle.digest('SHA-256', keyBytes);

  return globalThis.crypto.subtle.importKey(
    'raw',
    keyHash,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a plaintext message using authenticated AES-256-GCM with a random 12-byte IV.
 *
 * @param plaintext The plaintext string to encrypt
 * @param keyOrPassphrase Secret key or passphrase
 * @returns Serialized EncryptedPayload containing version, algorithm, IV, ciphertext, and tag
 */
export async function encryptPayload(
  plaintext: string,
  keyOrPassphrase: string
): Promise<EncryptedPayload> {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new DecryptionError('Plaintext cannot be empty');
  }

  const cryptoKey = await deriveAesKey(keyOrPassphrase);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const encodedPlaintext = encoder.encode(plaintext);

  // WebCrypto AES-GCM output is [ciphertext || 16-byte tag]
  const encryptedBuffer = await globalThis.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      tagLength: 128,
    },
    cryptoKey,
    encodedPlaintext
  );

  const encryptedBytes = new Uint8Array(encryptedBuffer);
  const tagLengthBytes = 16;
  const ciphertextBytes = encryptedBytes.slice(0, encryptedBytes.length - tagLengthBytes);
  const tagBytes = encryptedBytes.slice(encryptedBytes.length - tagLengthBytes);

  return {
    version: 1,
    algorithm: 'AES-GCM-256',
    iv: uint8ArrayToBase64(iv),
    ciphertext: uint8ArrayToBase64(ciphertextBytes),
    tag: uint8ArrayToBase64(tagBytes),
  };
}

/**
 * Decrypts an EncryptedPayload using AES-256-GCM.
 * Validates the authentication tag to ensure the message was not tampered with.
 *
 * @param encryptedPayload The encrypted payload containing IV, ciphertext, and tag
 * @param keyOrPassphrase Secret key or passphrase
 * @returns Decrypted plaintext string
 * @throws DecryptionError if tampering detected, wrong key provided, or payload invalid
 */
export async function decryptPayload(
  encryptedPayload: EncryptedPayload,
  keyOrPassphrase: string
): Promise<string> {
  if (!encryptedPayload || !encryptedPayload.iv || !encryptedPayload.ciphertext || !encryptedPayload.tag) {
    throw new DecryptionError('Invalid encrypted payload structure');
  }

  if (encryptedPayload.algorithm !== 'AES-GCM-256') {
    throw new DecryptionError(`Unsupported encryption algorithm: ${encryptedPayload.algorithm}`);
  }

  try {
    const cryptoKey = await deriveAesKey(keyOrPassphrase);
    const iv = base64ToUint8Array(encryptedPayload.iv);
    const ciphertextBytes = base64ToUint8Array(encryptedPayload.ciphertext);
    const tagBytes = base64ToUint8Array(encryptedPayload.tag);

    if (iv.length !== 12) {
      throw new DecryptionError('Invalid IV length: expected 12 bytes for AES-GCM');
    }

    if (tagBytes.length !== 16) {
      throw new DecryptionError('Invalid tag length: expected 16 bytes for AES-GCM');
    }

    // Recombine ciphertext and tag into an ArrayBuffer for WebCrypto decrypt
    const combinedBuffer = new ArrayBuffer(ciphertextBytes.length + tagBytes.length);
    const combinedView = new Uint8Array(combinedBuffer);
    combinedView.set(ciphertextBytes, 0);
    combinedView.set(tagBytes, ciphertextBytes.length);

    const decryptedBuffer = await globalThis.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv.buffer as ArrayBuffer,
        tagLength: 128,
      },
      cryptoKey,
      combinedBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err: unknown) {
    if (err instanceof DecryptionError) {
      throw err;
    }
    // WebCrypto throws DOMException "OperationError" on authentication failure or wrong key
    throw new DecryptionError('Decryption failed: payload corrupted, tampered, or invalid key');
  }
}
