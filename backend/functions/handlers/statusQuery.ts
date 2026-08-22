import { Request, Response } from 'express';
import { RelayStore } from '../relayStore';
import { BatchStatusQueryRequest, BatchStatusQueryResponse, RelayStatusRecord } from '../../../packages/shared/src/types';

/**
 * Status Query & Real-Time Sync Handlers
 */

// 1. Single Tracking ID Status Query
export const handleSingleStatusQuery = async (req: Request, res: Response) => {
  const { trackingId } = req.params;
  if (!trackingId) {
    return res.status(400).json({ error: 'trackingId parameter is required' });
  }

  const relayStore = RelayStore.getInstance();
  const record = await relayStore.getRecord(trackingId);

  if (!record) {
    return res.status(404).json({
      success: false,
      error: `Tracking record not found for ID: ${trackingId}`,
    });
  }

  return res.status(200).json({
    success: true,
    record,
  });
};

// 2. Batch Status Query (Used by Mobile Offline Sync Engine on Reconnect)
export const handleBatchStatusQuery = async (req: Request, res: Response) => {
  const { trackingIds } = req.body as BatchStatusQueryRequest;

  if (!Array.isArray(trackingIds)) {
    return res.status(400).json({
      success: false,
      error: 'trackingIds array is required in request body',
    });
  }

  const relayStore = RelayStore.getInstance();
  const records = await relayStore.getBatch(trackingIds);

  const response: BatchStatusQueryResponse = {
    records,
    timestamp: new Date().toISOString(),
  };

  return res.status(200).json({
    success: true,
    count: Object.keys(records).length,
    data: response,
  });
};

// 3. Complete Telemetry Overview (For Live Hackathon Demo & Judges)
export const handleAllStatusQuery = async (req: Request, res: Response) => {
  const relayStore = RelayStore.getInstance();
  const allRecords = await relayStore.getAllRecords();

  return res.status(200).json({
    success: true,
    totalMessagesTracked: allRecords.length,
    deliveredCount: allRecords.filter(r => r.status === 'DELIVERED').length,
    failedCount: allRecords.filter(r => r.status === 'FAILED').length,
    sentPendingCount: allRecords.filter(r => r.status === 'SENT').length,
    records: allRecords,
  });
};

// 4. Server-Sent Events (SSE) Live Stream for sub-second UI updates
export const handleStatusStream = (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const relayStore = RelayStore.getInstance();

  const unsubscribe = relayStore.subscribeAll((record: RelayStatusRecord) => {
    res.write(`data: ${JSON.stringify(record)}\n\n`);
  });

  // Keep-alive heartbeat every 15 seconds
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
};
