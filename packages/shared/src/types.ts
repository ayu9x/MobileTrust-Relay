/**
 * MobileTrust Relay - Canonical Type Definitions
 * Shared contract between Mobile, Cloud Relay, and Test suites.
 */

export type DeliveryStatus =
  | 'QUEUED_OFFLINE'
  | 'SENT'
  | 'DELIVERED'
  | 'FAILED';

export type MessagePriority =
  | 'HIGH_URGENT'
  | 'STANDARD';

export type CarrierStatus =
  | 'DELIVRD'
  | 'UNDELIV'
  | 'EXPIRED'
  | 'ACCEPTD';

export interface EmergencyMessage {
  id: string; // Tracking ID format: MTR-XXXXXX-XXXX
  recipient: string; // Indian E.164 phone: +91XXXXXXXXXX
  payload: string; // Plaintext or serialized EncryptedPayload
  isEncrypted: boolean;
  priority: MessagePriority;
  status: DeliveryStatus;
  retryCount: number;
  maxRetries: number;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
  deliveredAt?: string; // ISO-8601
  failureReason?: string;
  mergedWithId?: string;
}

export interface CarrierReceiptPayload {
  trackingId: string;
  recipient: string;
  carrierStatus: CarrierStatus;
  carrierTimestamp: string; // ISO-8601
  networkErrorCode?: string | null;
}

export interface EncryptedPayload {
  version: number;
  algorithm: 'AES-GCM-256';
  iv: string; // Base64
  ciphertext: string; // Base64
  tag: string; // Base64 (Authentication tag)
}

export type AuditEventType =
  | 'MESSAGE_CREATED'
  | 'MESSAGE_QUEUED_OFFLINE'
  | 'SMS_DISPATCHED'
  | 'SYNC_STARTED'
  | 'SYNC_SUCCEEDED'
  | 'SYNC_FAILED'
  | 'RETRY_STARTED'
  | 'RETRY_EXHAUSTED'
  | 'CARRIER_STATUS_UPDATED'
  | 'MESSAGE_DELIVERED'
  | 'MESSAGE_FAILED'
  | 'ENCRYPTION_FAILED'
  | 'DECRYPTION_FAILED'
  | 'NETWORK_OFFLINE'
  | 'NETWORK_ONLINE';

export interface AuditEvent {
  id: string;
  eventType: AuditEventType;
  trackingId?: string;
  timestamp: string; // ISO-8601
  metadata?: Record<string, unknown>;
}

export interface SyncError {
  trackingId: string;
  error: string;
  statusCode?: number;
  retryable: boolean;
}

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  updatedIds: string[];
  errors: SyncError[];
}

export interface MessageHistoryRecord {
  id: string;
  trackingId: string;
  status: DeliveryStatus;
  createdAt: string;
  deliveredAt?: string;
  contentHash: string;
  priority: MessagePriority;
  sizeBytes: number;
}

export interface StorageStats {
  totalBytes: number;
  messageCount: number;
  limitBytes: number;
  pruneThresholdBytes: number;
  isOverLimit: boolean;
  isOverThreshold: boolean;
  oldestMessageTimestamp?: string;
}

export interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterFactor: number;
}

export interface BatchStatusRequest {
  trackingIds: string[];
}

export interface BatchStatusResponse {
  statuses: Record<string, CarrierReceiptPayload>;
  notFound?: string[];
}

export interface RelayStatusResponse {
  trackingId: string;
  status: DeliveryStatus;
  carrierReceipt?: CarrierReceiptPayload;
  lastUpdated: string; // ISO-8601
}
