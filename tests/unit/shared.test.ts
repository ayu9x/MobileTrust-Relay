import { describe, expect, it } from 'vitest';
import {
  BatchStatusRequestSchema,
  BatchStatusResponseSchema,
  CarrierReceiptPayloadSchema,
  DeliveryStatusSchema,
  EmergencyMessage,
  EmergencyMessageSchema,
  IndianPhoneSchema,
  MessagePrioritySchema,
  RelayStatusResponseSchema,
  TrackingIdSchema,
  MAX_RETRIES,
  OFFLINE_QUEUE_MAX_HOURS,
  STORAGE_LIMIT_BYTES,
  STORAGE_PRUNE_THRESHOLD_BYTES,
} from '@mobiletrust/shared';

describe('Shared Package Contracts & Schemas', () => {
  describe('Constants Verification', () => {
    it('defines canonical project constants correctly', () => {
      expect(MAX_RETRIES).toBe(3);
      expect(OFFLINE_QUEUE_MAX_HOURS).toBe(2);
      expect(STORAGE_LIMIT_BYTES).toBe(15 * 1024 * 1024);
      expect(STORAGE_PRUNE_THRESHOLD_BYTES).toBe(10 * 1024 * 1024);
    });
  });

  describe('Indian E.164 Phone Validation', () => {
    it('accepts valid Indian E.164 phone numbers (+91 followed by 10 digits)', () => {
      expect(IndianPhoneSchema.safeParse('+919876543210').success).toBe(true);
      expect(IndianPhoneSchema.safeParse('+911234567890').success).toBe(true);
      expect(IndianPhoneSchema.safeParse('+917000000000').success).toBe(true);
    });

    it('rejects invalid phone numbers', () => {
      expect(IndianPhoneSchema.safeParse('9876543210').success).toBe(false); // missing +91
      expect(IndianPhoneSchema.safeParse('+19876543210').success).toBe(false); // US country code
      expect(IndianPhoneSchema.safeParse('+91987654321').success).toBe(false); // 9 digits
      expect(IndianPhoneSchema.safeParse('+9198765432100').success).toBe(false); // 11 digits
      expect(IndianPhoneSchema.safeParse('+91abcdefghij').success).toBe(false); // non-digits
      expect(IndianPhoneSchema.safeParse('').success).toBe(false);
    });
  });

  describe('Tracking ID Validation', () => {
    it('accepts valid MTR tracking IDs (MTR-<6 digits>-<4 hex chars>)', () => {
      expect(TrackingIdSchema.safeParse('MTR-172432-8F2B').success).toBe(true);
      expect(TrackingIdSchema.safeParse('MTR-000000-0000').success).toBe(true);
      expect(TrackingIdSchema.safeParse('MTR-999999-ABCD').success).toBe(true);
    });

    it('rejects invalid tracking IDs', () => {
      expect(TrackingIdSchema.safeParse('MTR-17243-8F2B').success).toBe(false); // 5 digits
      expect(TrackingIdSchema.safeParse('MTR-1724321-8F2B').success).toBe(false); // 7 digits
      expect(TrackingIdSchema.safeParse('MTR-172432-8F2').success).toBe(false); // 3 hex
      expect(TrackingIdSchema.safeParse('MTR-172432-8F2BZ').success).toBe(false); // non-hex Z
      expect(TrackingIdSchema.safeParse('TRK-172432-8F2B').success).toBe(false); // wrong prefix
      expect(TrackingIdSchema.safeParse('').success).toBe(false);
    });
  });

  describe('DeliveryStatus and MessagePriority Schemas', () => {
    it('accepts canonical delivery statuses', () => {
      expect(DeliveryStatusSchema.safeParse('QUEUED_OFFLINE').success).toBe(true);
      expect(DeliveryStatusSchema.safeParse('SENT').success).toBe(true);
      expect(DeliveryStatusSchema.safeParse('DELIVERED').success).toBe(true);
      expect(DeliveryStatusSchema.safeParse('FAILED').success).toBe(true);
      expect(DeliveryStatusSchema.safeParse('PENDING').success).toBe(false);
    });

    it('accepts canonical message priorities', () => {
      expect(MessagePrioritySchema.safeParse('HIGH_URGENT').success).toBe(true);
      expect(MessagePrioritySchema.safeParse('STANDARD').success).toBe(true);
      expect(MessagePrioritySchema.safeParse('LOW').success).toBe(false);
    });
  });

  describe('EmergencyMessage Schema', () => {
    const validMessage: EmergencyMessage = {
      id: 'MTR-123456-A1B2',
      recipient: '+919876543210',
      payload: 'Emergency evacuation assistance requested at Sector 4',
      isEncrypted: false,
      priority: 'HIGH_URGENT',
      status: 'QUEUED_OFFLINE',
      retryCount: 0,
      maxRetries: 3,
      createdAt: '2026-08-22T10:00:00.000Z',
      updatedAt: '2026-08-22T10:00:00.000Z',
    };

    it('validates a complete, conforming EmergencyMessage', () => {
      const result = EmergencyMessageSchema.safeParse(validMessage);
      expect(result.success).toBe(true);
    });

    it('rejects empty payload', () => {
      const invalid = { ...validMessage, payload: '' };
      expect(EmergencyMessageSchema.safeParse(invalid).success).toBe(false);
    });

    it('rejects retryCount exceeding 3', () => {
      const invalid = { ...validMessage, retryCount: 4 };
      expect(EmergencyMessageSchema.safeParse(invalid).success).toBe(false);
    });

    it('rejects invalid timestamps', () => {
      const invalid = { ...validMessage, createdAt: 'not-a-timestamp' };
      expect(EmergencyMessageSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('CarrierReceiptPayload Schema', () => {
    it('validates carrier receipt payloads', () => {
      const validReceipt = {
        trackingId: 'MTR-654321-FEED',
        recipient: '+919876543210',
        carrierStatus: 'DELIVRD',
        carrierTimestamp: '2026-08-22T10:05:00.000Z',
        networkErrorCode: null,
      };
      expect(CarrierReceiptPayloadSchema.safeParse(validReceipt).success).toBe(true);
    });

    it('rejects invalid carrier statuses', () => {
      const invalidReceipt = {
        trackingId: 'MTR-654321-FEED',
        recipient: '+919876543210',
        carrierStatus: 'UNKNOWN_STATUS',
        carrierTimestamp: '2026-08-22T10:05:00.000Z',
      };
      expect(CarrierReceiptPayloadSchema.safeParse(invalidReceipt).success).toBe(false);
    });
  });

  describe('Batch & Relay Status Schemas', () => {
    it('validates BatchStatusRequest', () => {
      expect(
        BatchStatusRequestSchema.safeParse({ trackingIds: ['MTR-111111-AAAA', 'MTR-222222-BBBB'] }).success
      ).toBe(true);
      expect(BatchStatusRequestSchema.safeParse({ trackingIds: [] }).success).toBe(false);
    });

    it('validates RelayStatusResponse', () => {
      const response = {
        trackingId: 'MTR-123456-A1B2',
        status: 'DELIVERED',
        carrierReceipt: {
          trackingId: 'MTR-123456-A1B2',
          recipient: '+919876543210',
          carrierStatus: 'DELIVRD',
          carrierTimestamp: '2026-08-22T10:05:00.000Z',
        },
        lastUpdated: '2026-08-22T10:05:00.000Z',
      };
      expect(RelayStatusResponseSchema.safeParse(response).success).toBe(true);
    });
  });
});
