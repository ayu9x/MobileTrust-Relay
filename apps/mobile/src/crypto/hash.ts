import { DUPLICATE_WINDOW_MS, TRACKING_ID_PREFIX } from '@mobiletrust/shared';

/**
 * Converts ArrayBuffer to lowercase hexadecimal string
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generates a compact MobileTrust Relay tracking ID.
 * Format: MTR-<6 digit timestamp>-<4 char hex hash>
 * Example: MTR-172432-8F2B
 *
 * @param timestamp Optional timestamp in milliseconds (defaults to Date.now())
 * @returns Tracking ID string formatted for SMS compatibility
 */
export function generateTrackingId(timestamp: number = Date.now()): string {
  // Extract 6-digit timestamp part (modulo 1000000 ensures exactly 6 digits)
  const timePart = (Math.floor(timestamp) % 1000000).toString().padStart(6, '0');

  // Generate 2 random bytes for 4-char uppercase hex hash
  const randomBytes = new Uint8Array(2);
  globalThis.crypto.getRandomValues(randomBytes);
  const hashPart = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

  return `${TRACKING_ID_PREFIX}${timePart}-${hashPart}`;
}

/**
 * Normalizes message body by trimming leading/trailing whitespace
 * and collapsing multiple internal whitespace characters to a single space.
 */
export function normalizeMessage(message: string): string {
  if (!message) return '';
  return message.trim().replace(/\s+/g, ' ');
}

/**
 * Computes the 5-minute time bucket for deduplication.
 */
export function get5MinuteBucket(timestamp: number = Date.now()): number {
  return Math.floor(timestamp / DUPLICATE_WINDOW_MS);
}

/**
 * Generates a SHA-256 content deduplication hash matching Person 2's backend algorithm:
 * SHA256(recipient + normalizedMessageBody + 5-minute time bucket)
 *
 * @param recipient E.164 phone number
 * @param messageBody Raw message text
 * @param timestamp Optional timestamp (defaults to Date.now())
 * @returns 64-character hex SHA-256 digest
 */
export async function generateContentHash(
  recipient: string,
  messageBody: string,
  timestamp: number = Date.now()
): Promise<string> {
  const normalized = normalizeMessage(messageBody);
  const bucket = get5MinuteBucket(timestamp);
  const data = `${recipient}:${normalized}:${bucket}`;

  const encoder = new TextEncoder();
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', encoder.encode(data));
  return bufferToHex(hashBuffer);
}

/**
 * Computes an HMAC-SHA256 digest of data with a secret key.
 *
 * @param data String data to sign
 * @param secretKey Secret key
 * @returns Hex-encoded HMAC string
 */
export async function generateHmac(data: string, secretKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(secretKey);
  const dataBytes = encoder.encode(data);

  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );

  const signature = await globalThis.crypto.subtle.sign('HMAC', cryptoKey, dataBytes);
  return bufferToHex(signature);
}

/**
 * Verifies an HMAC-SHA256 digest using timing-safe comparison.
 *
 * @param data String data
 * @param hmac Hex HMAC string to verify
 * @param secretKey Secret key
 * @returns true if valid, false otherwise
 */
export async function verifyHmac(data: string, hmac: string, secretKey: string): Promise<boolean> {
  try {
    const computedHmac = await generateHmac(data, secretKey);
    if (computedHmac.length !== hmac.length) {
      return false;
    }

    // Timing-safe constant-time comparison
    let diff = 0;
    for (let i = 0; i < computedHmac.length; i++) {
      diff |= computedHmac.charCodeAt(i) ^ hmac.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}
