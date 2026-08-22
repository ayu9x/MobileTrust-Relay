export type DeliveryStatus = 'QUEUED_OFFLINE' | 'SENT_RADIO' | 'RELAYED_CLOUD' | 'DELIVERED' | 'FAILED_CARRIER';
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
}
