import { z } from 'zod';

/**
 * Regex for Indian E.164 Phone Number format (+91 followed by 10 digits)
 */
export const INDIAN_PHONE_REGEX = /^\+91[0-9]{10}$/;

/**
 * Regex for MobileTrust Relay Tracking ID format (MTR-<6 digits>-<4 hex chars>)
 */
export const TRACKING_ID_REGEX = /^MTR-[0-9]{6}-[A-F0-9]{4}$/;

/**
 * ISO-8601 Timestamp Schema (supports standard ISO formats with timezone or Z)
 */
export const IsoTimestampSchema = z.string().refine(
  (val) => {
    const d = new Date(val);
    return !isNaN(d.getTime()) && (val.includes('T') || val.includes('Z') || /^\d{4}-\d{2}-\d{2}/.test(val));
  },
  { message: 'Invalid ISO-8601 timestamp' }
);

/**
 * Indian E.164 Phone Schema
 */
export const IndianPhoneSchema = z
  .string()
  .regex(INDIAN_PHONE_REGEX, 'Invalid Indian E.164 phone number. Format must be +91XXXXXXXXXX');

/**
 * Tracking ID Schema
 */
export const TrackingIdSchema = z
  .string()
  .regex(TRACKING_ID_REGEX, 'Invalid Tracking ID. Format must be MTR-<6 digits>-<4 hex chars> (e.g., MTR-172432-8F2B)');

/**
 * Delivery Status Schema
 */
export const DeliveryStatusSchema = z.enum([
  'QUEUED_OFFLINE',
  'SENT',
  'SENT_RADIO',
  'RELAYED_CLOUD',
  'DELIVERED',
  'FAILED',
  'FAILED_CARRIER',
]);

/**
 * Message Priority Schema
 */
export const MessagePrioritySchema = z.enum([
  'HIGH_URGENT',
  'STANDARD',
]);

/**
 * Carrier Status Schema
 */
export const CarrierStatusSchema = z.enum([
  'DELIVRD',
  'UNDELIV',
  'EXPIRED',
  'REJECTD',
  'ACCEPTD',
  'BUFFERED',
]);

/**
 * Encrypted Payload Schema
 */
export const EncryptedPayloadSchema = z.object({
  version: z.number().int().positive(),
  algorithm: z.literal('AES-GCM-256'),
  iv: z.string().min(1),
  ciphertext: z.string().min(1),
  tag: z.string().min(1),
});

/**
 * Emergency Message Schema
 */
export const EmergencyMessageSchema = z.object({
  id: TrackingIdSchema,
  recipient: IndianPhoneSchema,
  senderId: z.string().optional(),
  payload: z.string().optional(),
  content: z.string().optional(),
  isEncrypted: z.boolean().optional(),
  priority: MessagePrioritySchema,
  status: DeliveryStatusSchema,
  retryCount: z.number().int().min(0).max(3),
  maxRetries: z.number().int().min(1).optional(),
  createdAt: IsoTimestampSchema.optional(),
  updatedAt: IsoTimestampSchema.optional(),
  deliveredAt: IsoTimestampSchema.optional(),
  failureReason: z.string().optional(),
  mergedWithId: TrackingIdSchema.optional(),
  contentHash: z.string().optional(),
  timestampCreated: z.number().optional(),
  timestampSent: z.number().optional(),
  timestampDelivered: z.number().optional(),
  isAcknowledged: z.boolean().optional(),
  isCriticalDropout: z.boolean().optional(),
}).refine((data) => {
  const hasPayload = Boolean(data.payload && data.payload.trim().length > 0);
  const hasContent = Boolean(data.content && data.content.trim().length > 0);
  return hasPayload || hasContent;
}, {
  message: 'Message payload or content must not be empty',
});

/**
 * Carrier Receipt Payload Schema
 */
export const CarrierReceiptPayloadSchema = z.object({
  trackingId: TrackingIdSchema,
  recipient: IndianPhoneSchema,
  carrierStatus: CarrierStatusSchema,
  carrierTimestamp: IsoTimestampSchema,
  networkErrorCode: z.string().nullable().optional(),
});

/**
 * Batch Status Request Schema
 */
export const BatchStatusRequestSchema = z.object({
  trackingIds: z.array(TrackingIdSchema).min(1, 'At least one tracking ID must be provided'),
});

/**
 * Batch Status Response Schema
 */
export const BatchStatusResponseSchema = z.object({
  statuses: z.record(z.string(), CarrierReceiptPayloadSchema),
  notFound: z.array(z.string()).optional(),
});

/**
 * Relay Status Response Schema
 */
export const RelayStatusResponseSchema = z.object({
  trackingId: TrackingIdSchema,
  status: DeliveryStatusSchema,
  carrierReceipt: CarrierReceiptPayloadSchema.optional(),
  lastUpdated: IsoTimestampSchema,
});

/**
 * Audit Event Type Schema
 */
export const AuditEventTypeSchema = z.enum([
  'MESSAGE_CREATED',
  'MESSAGE_QUEUED_OFFLINE',
  'SMS_DISPATCHED',
  'SYNC_STARTED',
  'SYNC_SUCCEEDED',
  'SYNC_FAILED',
  'RETRY_STARTED',
  'RETRY_EXHAUSTED',
  'CARRIER_STATUS_UPDATED',
  'MESSAGE_DELIVERED',
  'MESSAGE_FAILED',
  'ENCRYPTION_FAILED',
  'DECRYPTION_FAILED',
  'NETWORK_OFFLINE',
  'NETWORK_ONLINE',
]);

/**
 * Audit Event Schema
 */
export const AuditEventSchema = z.object({
  id: z.string().min(1),
  eventType: AuditEventTypeSchema,
  trackingId: TrackingIdSchema.optional(),
  timestamp: IsoTimestampSchema,
  metadata: z.record(z.unknown()).optional(),
});
