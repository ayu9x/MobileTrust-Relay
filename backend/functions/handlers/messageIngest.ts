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
