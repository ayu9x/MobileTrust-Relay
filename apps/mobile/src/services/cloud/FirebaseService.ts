import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
} from '@react-native-firebase/firestore';
import { encryptMessage } from '../../utils/encryption';
import { EmergencyMessage, MessagePriority } from '@mobiletrust/shared';

const MESSAGES_COLLECTION = 'messages';
const DUPLICATE_TIME_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export interface CloudMessage {
  id: string;
  recipient: string;
  content: string; // Encrypted
  priority: MessagePriority;
  status: string;
  timestampCreated: number;
}

class FirebaseService {
  /**
   * Initializes Firestore offline persistence.
   */
  async initialize() {
    try {
      // Firebase React Native automatically handles offline persistence
      // No explicit settings needed for default persistence in modular API
      console.log('Firestore initialized with offline persistence');
    } catch (e) {
      console.error('Firestore initialization error', e);
    }
  }

  /**
   * Checks if a similar message was sent to the same recipient recently.
   */
  async isDuplicate(recipient: string, content: string): Promise<boolean> {
    try {
      const encryptedContent = encryptMessage(content);
      const timeThreshold = Date.now() - DUPLICATE_TIME_WINDOW_MS;

      const db = getFirestore();
      const messagesRef = collection(db, MESSAGES_COLLECTION);
      const q = query(
        messagesRef,
        where('recipient', '==', recipient),
        where('content', '==', encryptedContent),
        where('timestampCreated', '>=', timeThreshold)
      );
      const snapshot = await getDocs(q);

      return !snapshot.empty;
    } catch (e) {
      console.error('Failed to check for duplicates', e);
      return false;
    }
  }

  /**
   * Syncs a message to the cloud.
   */
  async syncMessage(message: EmergencyMessage) {
    try {
      const encryptedContent = encryptMessage(message.content);
      
      const cloudMsg: CloudMessage = {
        id: message.id,
        recipient: message.recipient,
        content: encryptedContent,
        priority: message.priority,
        status: message.status,
        timestampCreated: message.timestampCreated,
      };

      const db = getFirestore();
      await setDoc(doc(db, MESSAGES_COLLECTION, message.id), cloudMsg, { merge: true });
        
      console.log(`Message ${message.id} synced to Firestore.`);
    } catch (e) {
      console.error('Failed to sync message to cloud', e);
      // Offline mode: Firestore will queue this write and execute it when online
    }
  }
}

export default new FirebaseService();
