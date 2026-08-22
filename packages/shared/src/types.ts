/**
 * MobileTrust Relay - Canonical Type Definitions
 * Shared contract between Mobile, Cloud Relay, and Test suites.
 */

export type DeliveryStatus = 'QUEUED_OFFLINE' | 'SENT_RADIO' | 'RELAYED_CLOUD' | 'DELIVERED' | 'FAILED_CARRIER' | 'SENT' | 'FAILED';
export type MessagePriority = 'HIGH_URGENT' | 'STANDARD';

export interface EmergencyMessage {
  id: string; // MTR-<TIMESTAMP>-<HASH4>
  recipient: string; // +91XXXXXXXXXX
  content: string; // Encrypted if needed, max 160 chars unencrypted
  status: DeliveryStatus;
  priority: MessagePriority;
  retryCount: number;
  timestampCreated: number;
  timestampSent?: number;
  timestampDelivered?: number;
  // Optional backend fields appended from Harsh's branch
  senderId?: string;
  payload?: string;
  isEncrypted?: boolean;
  maxRetries?: number;
  createdAt?: string;
  updatedAt?: string;
  deliveredAt?: string;
  failureReason?: string;
  mergedWithId?: string;
  contentHash?: string;
}

export type CarrierStatus =
  | 'DELIVRD'
  | 'UNDELIV'
  | 'EXPIRED'
  | 'REJECTD'
  | 'ACCEPTD'
  | 'BUFFERED';

export type CarrierStatusRaw = CarrierStatus;

export interface CarrierReceiptPayload {
  trackingId: string;
  recipient: string;
  carrierStatus: CarrierStatus;
  carrierTimestamp: string;        // ISO-8601
  networkErrorCode?: string | null;
  carrierName?: 'Jio-MH' | 'Airtel-North' | 'BSNL-DisasterRelief' | string;
}

export interface EncryptedPayload {
  version: number;
  algorithm: 'AES-GCM-256';
  iv: string;                      // Base64
  ciphertext: string;              // Base64
  tag: string;                     // Base64 (Authentication tag)
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
  timestamp: string;               // ISO-8601
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

export interface RelayStatusRecord {
  trackingId: string;
  recipient: string;
  status: DeliveryStatus;
  rawCarrierStatus: CarrierStatus;
  priority?: MessagePriority;
  updatedAt: string;
  deliveredAt?: string;
  processedInMs: number;
  duplicateClusterIds?: string[];
  carrierName?: string;
  failureReason?: string;
}

export interface BatchStatusQueryRequest {
  trackingIds: string[];
}

export interface BatchStatusQueryResponse {
  records: Record<string, RelayStatusRecord>;
  timestamp: string;
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
  lastUpdated: string;             // ISO-8601
}
