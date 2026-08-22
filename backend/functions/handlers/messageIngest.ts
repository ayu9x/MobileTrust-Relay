import { Request, Response } from 'express';
import { EmergencyMessage, RelayStatusRecord } from '../../../packages/shared/src/types';
import { RelayStore } from '../relayStore';
import { DeduplicationEngine } from './deduplication';

/**
 * Message Ingestion & Pre-registration Handler
 * Called by mobile client when dispatching an alert or flushing offline queues.
 */
export const handleMessageIngest = async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const message = req.body as EmergencyMessage;
    const { id, recipient, payload, priority } = message;

    if (!id || !recipient) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed: id and recipient are required',
      });
    }

    const relayStore = RelayStore.getInstance();
    const dedupEngine = DeduplicationEngine.getInstance();

    // Check for duplicate messages sent by multiple responders to same recipient in 5m window
    const dedupResult = dedupEngine.checkAndMerge(id, recipient, payload || '');

    const nowIso = new Date().toISOString();
    const relayRecord: RelayStatusRecord = {
      trackingId: id,
      recipient,
      status: 'SENT',
      rawCarrierStatus: 'ACCEPTD',
      priority: priority || 'STANDARD',
      updatedAt: nowIso,
      processedInMs: Date.now() - startTime,
      duplicateClusterIds: dedupResult.isDuplicate ? dedupResult.allClusterIds : undefined,
    };

    await relayStore.putRecord(relayRecord);

    console.log(
      `[MESSAGE INGEST] Registered TrackingID: ${id} | Priority: ${priority} | Clustered: ${dedupResult.isDuplicate} (Cluster Size: ${dedupResult.clusterSize})`
    );

    // Realistic Carrier DLR Simulation (auto-delivers after 2.5s for live demo)
    setTimeout(async () => {
      try {
        const isFailureSim = (payload || '').toLowerCase().includes('fail') || (payload || '').toLowerCase().includes('dropout');
        const deliveryStatus = isFailureSim ? 'FAILED' : 'DELIVERED';
        const carrierStatus = isFailureSim ? 'UNDELIV' : 'DELIVRD';
        const failureReason = isFailureSim ? 'Simulated cell tower dropout in disaster zone' : undefined;

        const updated: RelayStatusRecord = {
          ...relayRecord,
          status: deliveryStatus,
          rawCarrierStatus: carrierStatus,
          updatedAt: new Date().toISOString(),
          deliveredAt: !isFailureSim ? new Date().toISOString() : undefined,
          carrierName: 'Jio-DisasterRelief',
          failureReason,
        };
        await relayStore.putRecord(updated);
        console.log(`[CARRIER SIMULATION] Auto-delivered TrackingID: ${id} -> ${deliveryStatus}`);
      } catch (err) {
        console.error('[CARRIER SIMULATION ERROR]', err);
      }
    }, 2500);

    return res.status(201).json({
      success: true,
      record: relayRecord,
      isDuplicate: dedupResult.isDuplicate,
      primaryTrackingId: dedupResult.primaryTrackingId,
      clusterSize: dedupResult.clusterSize,
    });
  } catch (error: any) {
    console.error('[MESSAGE INGEST ERROR]', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to ingest emergency message',
    });
  }
};

