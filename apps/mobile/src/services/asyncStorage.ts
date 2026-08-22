/**
 * Storage Abstraction Layer for MobileTrust Relay.
 * Compatible with React Native's @react-native-async-storage/async-storage
 * with a deterministic in-memory fallback for unit testing and headless environments.
 */

export interface IAsyncStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(): Promise<string[]>;
}

/**
 * In-Memory storage implementation for tests and environments without native AsyncStorage.
 */
export class InMemoryStorage implements IAsyncStorage {
  private store: Map<string, string> = new Map();

  async getItem(key: string): Promise<string | null> {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, String(value));
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async getAllKeys(): Promise<string[]> {
    return Array.from(this.store.keys());
  }

  /**
   * Helper to inspect current memory store size in bytes
   */
  getByteSize(): number {
    let total = 0;
    for (const [k, v] of this.store.entries()) {
      total += k.length + v.length;
    }
    return total;
  }
}

// Default storage instance
let currentStorage: IAsyncStorage = new InMemoryStorage();

/**
 * Get the active storage engine
 */
export function getStorage(): IAsyncStorage {
  return currentStorage;
}

/**
 * Override the storage engine (e.g. for testing or native dependency injection)
 */
export function setStorage(storage: IAsyncStorage): void {
  currentStorage = storage;
}

/**
 * Resets the in-memory storage (useful between test runs)
 */
export async function resetStorage(): Promise<void> {
  if (currentStorage instanceof InMemoryStorage) {
    await currentStorage.clear();
  }
}
