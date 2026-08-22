import { RelayStatusRecord, DeliveryStatus, CarrierStatusRaw, MessagePriority } from '../../packages/shared/src/types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Stateless Cloud Storage Relay Abstraction
 * Compliant with PRD constraint:
 * "No backend server or database is allowed — only cloud storage and serverless functions."
 * Simulates an S3 / Firebase Cloud Storage bucket where each tracking ID is an immutable or atomic object.
 */
export class RelayStore {
  private static instance: RelayStore;
  private memoryBucket: Map<string, RelayStatusRecord> = new Map();
  private subscribers: Map<string, Set<(record: RelayStatusRecord) => void>> = new Map();
  private globalSubscribers: Set<(record: RelayStatusRecord) => void> = new Set();
  private storageDir: string;

  private constructor() {
    this.storageDir = path.join(__dirname, '../../.cloud_storage_bucket');
    try {
      if (!fs.existsSync(this.storageDir)) {
        fs.mkdirSync(this.storageDir, { recursive: true });
      }
    } catch {
      // In-memory fallback if file system access is constrained
    }
  }

  public static getInstance(): RelayStore {
    if (!RelayStore.instance) {
      RelayStore.instance = new RelayStore();
    }
    return RelayStore.instance;
  }

  /**
   * Save or update a relay record atomically
   */
  public async putRecord(record: RelayStatusRecord): Promise<void> {
    this.memoryBucket.set(record.trackingId, record);

    // Save as atomic cloud storage JSON object (Simulating S3 PutObject / Firestore doc)
    try {
      const filePath = path.join(this.storageDir, `${record.trackingId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8');
    } catch (err) {
      // In memory fallback
    }

    // Notify listeners for real-time mobile app updates (< 15s)
    this.notifySubscribers(record);
  }

  /**
   * Get a relay record by tracking ID
   */
  public async getRecord(trackingId: string): Promise<RelayStatusRecord | null> {
    if (this.memoryBucket.has(trackingId)) {
      return this.memoryBucket.get(trackingId)!;
    }

    try {
      const filePath = path.join(this.storageDir, `${trackingId}.json`);
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf-8');
        const record = JSON.parse(data) as RelayStatusRecord;
        this.memoryBucket.set(trackingId, record);
        return record;
      }
    } catch {
      // Fallback
    }

    return null;
  }

  /**
   * Get multiple records in batch
   */
  public async getBatch(trackingIds: string[]): Promise<Record<string, RelayStatusRecord>> {
    const results: Record<string, RelayStatusRecord> = {};
    for (const id of trackingIds) {
      const record = await this.getRecord(id);
      if (record) {
        results[id] = record;
      }
    }
    return results;
  }

  /**
   * Get all active relay records (for dashboard & telemetry)
   */
  public async getAllRecords(): Promise<RelayStatusRecord[]> {
    return Array.from(this.memoryBucket.values());
  }

  /**
   * Real-time subscription for live server-sent events or WebSocket pushes
   */
  public subscribe(trackingId: string, callback: (record: RelayStatusRecord) => void): () => void {
    if (!this.subscribers.has(trackingId)) {
      this.subscribers.set(trackingId, new Set());
    }
    this.subscribers.get(trackingId)!.add(callback);

    return () => {
      this.subscribers.get(trackingId)?.delete(callback);
    };
  }

  public subscribeAll(callback: (record: RelayStatusRecord) => void): () => void {
    this.globalSubscribers.add(callback);
    return () => {
      this.globalSubscribers.delete(callback);
    };
  }

  private notifySubscribers(record: RelayStatusRecord): void {
    const specific = this.subscribers.get(record.trackingId);
    if (specific) {
      specific.forEach(cb => cb(record));
    }
    this.globalSubscribers.forEach(cb => cb(record));
  }
}
