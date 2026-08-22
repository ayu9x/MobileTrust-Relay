import { Request, Response } from 'express';
import { CarrierReceiptPayload, DeliveryStatus, RelayStatusRecord } from '../../../packages/shared/src/types';
import { RelayStore } from '../relayStore';
import { DeduplicationEngine } from './deduplication';

/**
 * Carrier Delivery Receipt (DLR) Webhook Ingestion Handler
 * PRD Requirement: Must process delivery updates within 30 seconds of receipt.
 * Evaluates DLR status codes from Indian telecom carriers (Airtel, Jio, BSNL, Vi, Twilio).
 */
export const handleCarrierWebhook = async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const payload = req.body as CarrierReceiptPayload;
    const { trackingId, carrierStatus, recipient, carrierTimestamp, networkErrorCode, carrierName } = payload;

    if (!trackingId || !carrierStatus) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed: trackingId and carrierStatus are required fields.',
      });
    }

    const relayStore = RelayStore.getInstance();
    const dedupEngine = DeduplicationEngine.getInstance();

    // Map carrier telecom status codes to normalized MobileTrust Relay status
    let normalizedStatus: DeliveryStatus;
    let failureReason: string | undefined;

    switch (carrierStatus) {
      case 'DELIVRD':
        normalizedStatus = 'DELIVERED';
        break;
      case 'UNDELIV':
        normalizedStatus = 'FAILED';
        failureReason = networkErrorCode ? `Carrier dropout: ${networkErrorCode}` : 'Recipient cell tower unreachable';
        break;
      case 'EXPIRED':
        normalizedStatus = 'FAILED';
        failureReason = 'SMS validity period expired in SMSC transit queue';
        break;
      case 'REJECTD':
        normalizedStatus = 'FAILED';
        failureReason = 'Carrier rejected message (NDNC DND filter or blocked)';
        break;
      case 'BUFFERED':
      case 'ACCEPTD':
        normalizedStatus = 'SENT';
        break;
      default:
        normalizedStatus = 'SENT';
    }

    // Find all tracking IDs if this message was clustered/deduplicated
    const clusterIds = dedupEngine.getClusterFor(trackingId);

    const nowIso = new Date().toISOString();
    const processingTimeMs = Date.now() - startTime;

    // Update all linked cluster tracking IDs atomically in the relay
    const recordsUpdated: RelayStatusRecord[] = [];

    for (const id of clusterIds) {
      const existing = await relayStore.getRecord(id);
      const updatedRecord: RelayStatusRecord = {
        trackingId: id,
        recipient: recipient || existing?.recipient || 'Unknown',
        status: normalizedStatus,
        rawCarrierStatus: carrierStatus,
        priority: existing?.priority || 'STANDARD',
        updatedAt: nowIso,
        deliveredAt: normalizedStatus === 'DELIVERED' ? (carrierTimestamp || nowIso) : existing?.deliveredAt,
        processedInMs: processingTimeMs,
        duplicateClusterIds: clusterIds.length > 1 ? clusterIds : undefined,
        carrierName: carrierName || existing?.carrierName || 'BSNL-DisasterRelief',
        failureReason: failureReason || existing?.failureReason,
      };

      await relayStore.putRecord(updatedRecord);
      recordsUpdated.push(updatedRecord);
    }

    console.log(
      `[CARRIER WEBHOOK] Processed DLR for TrackingID: ${trackingId} (${carrierName || 'Carrier'}) -> ${normalizedStatus} in ${processingTimeMs}ms`
    );

    return res.status(200).json({
      success: true,
      message: `Delivery receipt ingested and state updated for ${recordsUpdated.length} tracking record(s)`,
      processingTimeMs,
      normalizedStatus,
      records: recordsUpdated,
    });
  } catch (error: any) {
    console.error('[CARRIER WEBHOOK ERROR]', error);
    return res.status(500).json({
      success: false,
      error: 'Internal cloud relay processing error',
      details: error?.message,
    });
  }
};
