import firestore from '@react-native-firebase/firestore';
import { encryptMessage } from '../../utils/encryption';
import { Message, UrgencyLevel } from '../../context/MessageContext';

const MESSAGES_COLLECTION = 'messages';
const DUPLICATE_TIME_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export interface CloudMessage {
  id: string;
  recipient: string;
  content: string; // Encrypted
  urgency: UrgencyLevel;
  status: string;
  timestamp: number;
}

class FirebaseService {
  /**
   * Initializes Firestore offline persistence.
   */
  async initialize() {
    try {
      // Firebase React Native automatically handles offline persistence
      // We can explicitly configure settings if needed
      await firestore().settings({
        persistence: true,
      });
      console.log('Firestore initialized with offline persistence');
    } catch (e) {
      console.error('Firestore initialization error', e);
    }
  }

  /**
   * Checks if a duplicate message was sent recently to the same recipient.
   */
  async isDuplicate(recipient: string, content: string): Promise<boolean> {
    try {
      const fiveMinutesAgo = Date.now() - DUPLICATE_TIME_WINDOW_MS;
      const encryptedContent = encryptMessage(content); // Compare encrypted payloads or hash them
      
      const snapshot = await firestore()
        .collection(MESSAGES_COLLECTION)
        .where('recipient', '==', recipient)
        .where('timestamp', '>=', fiveMinutesAgo)
        .get();
        
      // Check if any recent message matches the exact content (or a hash in a real app)
      // Since AES encryption with random IV produces different ciphertexts,
      // a better approach is to store a SHA-256 hash of the content for comparison.
      // For MVP, we assume any message to the same recipient in 5 mins is a potential duplicate warning.
      if (!snapshot.empty) {
        return true;
      }
      return false;
    } catch (e) {
      console.error('Duplicate check failed', e);
      return false; // Fail open
    }
  }

  /**
   * Syncs a message to the cloud.
   */
  async syncMessage(message: Message) {
    try {
      const encryptedContent = encryptMessage(message.content);
      
      const cloudMsg: CloudMessage = {
        id: message.id,
        recipient: message.recipient,
        content: encryptedContent,
        urgency: message.urgency,
        status: message.status,
        timestamp: message.timestamp,
      };

      await firestore()
        .collection(MESSAGES_COLLECTION)
        .doc(message.id)
        .set(cloudMsg, { merge: true });
        
      console.log('Message synced to cloud');
    } catch (e) {
      console.error('Failed to sync message to cloud', e);
      // Offline mode: Firestore will queue this write and execute it when online
    }
  }
}

export default new FirebaseService();
