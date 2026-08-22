export type DeliveryStatus = 
  | 'QUEUED_OFFLINE' 
  | 'SENT' 
  | 'RELAYED_CLOUD'
  | 'DELIVERED' 
  | 'FAILED';

export type MessagePriority = 'HIGH_URGENT' | 'STANDARD';

export type CarrierStatusRaw = 
  | 'DELIVRD' 
  | 'UNDELIV' 
  | 'EXPIRED' 
  | 'REJECTD' 
  | 'ACCEPTD' 
  | 'BUFFERED';

export interface EmergencyMessage {
  id: string;                      // Tracking ID, e.g. "MTR-172432-8F2B"
  recipient: string;               // E.164 phone format "+91XXXXXXXXXX"
  senderId?: string;               // Responder ID / Device Hash
  payload: string;                 // Plaintext or encrypted ciphertext
  isEncrypted: boolean;
  priority: MessagePriority;
  status: DeliveryStatus;
  retryCount: number;
  maxRetries: number;              // Fixed to 3 per PRD
  createdAt: string;               // ISO 8601
  updatedAt: string;
  deliveredAt?: string;
  failureReason?: string;
  mergedWithId?: string;           // Populated if deduplicated with another responder's alert
  contentHash?: string;            // SHA-256 for deduplication
}

export interface CarrierReceiptPayload {
  trackingId: string;
  recipient: string;
  carrierStatus: CarrierStatusRaw;
  carrierTimestamp: string;
  networkErrorCode?: string | null;
  carrierName?: 'Jio-MH' | 'Airtel-North' | 'BSNL-DisasterRelief' | string;
}

export interface RelayStatusRecord {
  trackingId: string;
  recipient: string;
  status: DeliveryStatus;
  rawCarrierStatus: CarrierStatusRaw;
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
