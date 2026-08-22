import CryptoJS from 'crypto-js';

// In a real app, this key should be securely stored in Keychain/Keystore
// and NEVER hardcoded in the source code.
const SECRET_KEY = 'emergency_relay_secret_key_2026';

/**
 * Encrypts a message payload.
 */
export const encryptMessage = (content: string): string => {
  return CryptoJS.AES.encrypt(content, SECRET_KEY).toString();
};

/**
 * Decrypts a message payload.
 */
export const decryptMessage = (ciphertext: string): string => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};
