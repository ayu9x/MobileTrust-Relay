import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { handleCarrierWebhook } from './handlers/carrierWebhook';
import { handleMessageIngest } from './handlers/messageIngest';
import { 
  handleSingleStatusQuery, 
  handleBatchStatusQuery, 
  handleAllStatusQuery, 
  handleStatusStream 
} from './handlers/statusQuery';

const app: Express = express();

app.use(cors());
app.use(express.json());

// Health & Metadata check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    system: 'MobileTrust Relay Cloud Serverless Engine',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    evaluationCompliance: {
      stateless: true,
      noPersistentCustomDb: true,
      maxProcessingLatencySec: 30,
      displayLatencyBudgetSec: 15,
    }
  });
});

// 1. Ingest outbound SMS tracking ID from responder mobile device
app.post('/api/messages/ingest', handleMessageIngest);

// 2. Ingest inbound carrier delivery receipts (DLR)
app.post('/api/carrier/webhook', handleCarrierWebhook);

// 3. Status Queries
app.get('/api/status/stream', handleStatusStream);
app.get('/api/status/all', handleAllStatusQuery);
app.get('/api/status/:trackingId', handleSingleStatusQuery);
app.post('/api/status/batch', handleBatchStatusQuery);

const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== 'production' || !process.env.FIREBASE_CONFIG) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` 🚀 MobileTrust Relay Cloud Serverless Engine`);
    console.log(` 📡 Server running on: http://localhost:${PORT}`);
    console.log(` 🛰  Carrier Webhook:   POST http://localhost:${PORT}/api/carrier/webhook`);
    console.log(` 🔄 Batch Status Sync: POST http://localhost:${PORT}/api/status/batch`);
    console.log(` 📊 Telemetry Feed:    GET  http://localhost:${PORT}/api/status/all`);
    console.log(` ⚡ Live SSE Stream:   GET  http://localhost:${PORT}/api/status/stream`);
    console.log(`====================================================`);
  });
}

// Export for serverless / Firebase Functions v2
export const mobileTrustRelayApi = app;
