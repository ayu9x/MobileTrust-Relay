import {
  EmergencyMessage,
  EmergencyMessageSchema,
  StorageStats,
  STORAGE_KEYS,
} from '@mobiletrust/shared';
import { getStorage } from '../services/asyncStorage';
import { enforceStorageBudget, getStorageStats } from '../services/storageBudget';

export type StoreListener = () => void;

/**
 * Reactive state store for Emergency Messages in MobileTrust Relay.
 * Implements full persistence, storage budget enforcement, and subscriber notifications.
 */
export class MessageStore {
  private messages: Map<string, EmergencyMessage> = new Map();
  private listeners: Set<StoreListener> = new Set();
  private isLoaded: boolean = false;

  constructor() {}

  /**
   * Subscribes a listener to store updates.
   * Returns an unsubscribe function.
   */
  subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Adds an emergency message to the store.
   * Validates schema, enforces storage budget, persists, and notifies subscribers.
   */
  async addMessage(message: EmergencyMessage): Promise<void> {
    const validated = EmergencyMessageSchema.parse(message);
    this.messages.set(validated.id, validated);
    await this.persistAndNotify();
  }

  /**
   * Updates an existing emergency message with partial updates.
   */
  async updateMessage(id: string, patch: Partial<EmergencyMessage>): Promise<void> {
    const existing = this.messages.get(id);
    if (!existing) {
      return;
    }

    const updated: EmergencyMessage = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    const validation = EmergencyMessageSchema.safeParse(updated);
    const finalMsg = validation.success ? validation.data : updated;
    this.messages.set(id, finalMsg);
    await this.persistAndNotify();
  }

  /**
   * Retrieves a single message by ID.
   */
  getMessage(id: string): EmergencyMessage | undefined {
    return this.messages.get(id);
  }

  /**
   * Retrieves all messages as an array.
   */
  getMessages(): EmergencyMessage[] {
    return Array.from(this.messages.values());
  }

  /**
   * Removes a message from the store by ID.
   */
  async removeMessage(id: string): Promise<void> {
    if (this.messages.delete(id)) {
      await this.persistAndNotify();
    }
  }

  /**
   * Retrieves all pending/unresolved messages (QUEUED_OFFLINE, SENT, or active FAILED_CARRIER retries).
   */
  getPendingMessages(): EmergencyMessage[] {
    return Array.from(this.messages.values()).filter(
      (m) => m.status === 'QUEUED_OFFLINE' || m.status === 'SENT' || (m.status === 'FAILED_CARRIER' && (m.retryCount || 0) < 3)
    );
  }

  /**
   * Marks a message as DELIVERED.
   */
  async markDelivered(id: string, deliveredAt?: string): Promise<void> {
    const timestamp = deliveredAt || new Date().toISOString();
    await this.updateMessage(id, {
      status: 'DELIVERED',
      deliveredAt: timestamp,
    });
  }

  /**
   * Marks a message as FAILED with a specific reason and sets retryCount to 3.
   */
  async markFailed(id: string, reason: string): Promise<void> {
    await this.updateMessage(id, {
      status: 'FAILED',
      failureReason: reason,
      retryCount: 3,
    });
  }

  /**
   * Increments the retry count for a message.
   */
  async incrementRetry(id: string): Promise<number> {
    const existing = this.messages.get(id);
    if (!existing) return 0;

    const newRetryCount = existing.retryCount + 1;
    await this.updateMessage(id, {
      retryCount: newRetryCount,
    });
    return newRetryCount;
  }

  /**
   * Returns current storage statistics.
   */
  getStorageStats(): StorageStats {
    return getStorageStats(Array.from(this.messages.values()));
  }

  /**
   * Clears all messages from the store and storage.
   */
  async clear(): Promise<void> {
    this.messages.clear();
    const storage = getStorage();
    await storage.removeItem(STORAGE_KEYS.MESSAGES);
    this.notifyListeners();
  }

  /**
   * Loads persisted messages from storage.
   */
  async loadPersisted(): Promise<void> {
    try {
      const storage = getStorage();
      const raw = await storage.getItem(STORAGE_KEYS.MESSAGES);
      if (raw) {
        const parsed: EmergencyMessage[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.messages.clear();
          for (const msg of parsed) {
            const validation = EmergencyMessageSchema.safeParse(msg);
            if (validation.success) {
              this.messages.set(validation.data.id, validation.data);
            }
          }
        }
      }
      this.isLoaded = true;
      this.notifyListeners();
    } catch (err) {
      console.error('Failed to load persisted messages:', err);
      this.isLoaded = true;
    }
  }

  private async persistAndNotify(): Promise<void> {
    const currentList = Array.from(this.messages.values());
    // Apply storage budget enforcement
    const { messages: budgetCompliantList } = enforceStorageBudget(currentList);

    // Update internal map if pruning occurred
    if (budgetCompliantList.length !== this.messages.size) {
      this.messages.clear();
      for (const msg of budgetCompliantList) {
        this.messages.set(msg.id, msg);
      }
    }

    try {
      const storage = getStorage();
      await storage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(budgetCompliantList));
    } catch (err) {
      console.error('Failed to persist messages to storage:', err);
    }

    this.notifyListeners();
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('Error executing message store listener:', err);
      }
    }
  }
}

// Global default instance
export const messageStore = new MessageStore();
