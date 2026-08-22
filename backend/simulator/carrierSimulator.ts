import http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import { CarrierReceiptPayload, CarrierStatusRaw } from '../../packages/shared/src/types';

interface SimulatorTransition {
  status: CarrierStatusRaw;
  delayMs: number;
  networkErrorCode?: string;
}

interface ScenarioConfig {
  scenario: string;
  description: string;
  trackingId?: string;
  trackingIdPrimary?: string;
  trackingIdDuplicate?: string;
  recipient: string;
  carrierName: string;
  message?: string;
  transitions: SimulatorTransition[];
}

const SERVER_PORT = process.env.PORT || 4000;
const WEBHOOK_PATH = '/api/carrier/webhook';
const INGEST_PATH = '/api/messages/ingest';

const postJson = (apiPath: string, payload: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const options = {
      hostname: 'localhost',
      port: SERVER_PORT,
      path: apiPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve({ raw: body, statusCode: res.statusCode });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
};

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

async function runScenario(scenario: ScenarioConfig) {
  console.log(`\n=============================================================`);
  console.log(`📡 [CARRIER SIMULATOR] Running: "${scenario.scenario.toUpperCase()}"`);
  console.log(`ℹ️  Description: ${scenario.description}`);
  console.log(`📱 Recipient:   ${scenario.recipient}`);
  console.log(`🛰  Network:     ${scenario.carrierName}`);
  console.log(`=============================================================\n`);

  if (scenario.scenario === 'duplicate_responder_alerts') {
    // 1. Ingest Primary Responder Alert
    console.log(`[RESPONDER 1] Dispatched Alert -> TrackingID: ${scenario.trackingIdPrimary}`);
    await postJson(INGEST_PATH, {
      id: scenario.trackingIdPrimary,
      recipient: scenario.recipient,
      payload: scenario.message,
      priority: 'HIGH_URGENT',
      status: 'SENT',
      createdAt: new Date().toISOString(),
    });

    await sleep(500);

    // 2. Ingest Duplicate Alert from Responder 2
    console.log(`[RESPONDER 2] Dispatched Identical Alert -> TrackingID: ${scenario.trackingIdDuplicate}`);
    const dedupRes = await postJson(INGEST_PATH, {
      id: scenario.trackingIdDuplicate,
      recipient: scenario.recipient,
      payload: scenario.message,
      priority: 'HIGH_URGENT',
      status: 'SENT',
      createdAt: new Date().toISOString(),
    });

    console.log(`⚡ [CLOUD RELAY CLUSTERING] Merged duplicate: ${dedupRes.isDuplicate ? 'YES (Cluster Size: ' + dedupRes.clusterSize + ')' : 'NO'}`);

    // 3. Emit Single Carrier Receipt to primary
    await sleep(1500);
    console.log(`[TOWER DLR] Carrier emits DELIVRD to primary -> ${scenario.trackingIdPrimary}`);
    const dlrRes = await postJson(WEBHOOK_PATH, {
      trackingId: scenario.trackingIdPrimary,
      recipient: scenario.recipient,
      carrierStatus: 'DELIVRD',
      carrierName: scenario.carrierName,
      carrierTimestamp: new Date().toISOString(),
    });

    console.log(`✅ [PROPAGATION] Updated all ${dlrRes.records?.length || 0} clustered tracking records in < ${dlrRes.processingTimeMs}ms`);
    return;
  }

  const trackingId = scenario.trackingId || `MTR-${Math.floor(Date.now() / 1000)}-TEST`;

  // First register message
  await postJson(INGEST_PATH, {
    id: trackingId,
    recipient: scenario.recipient,
    payload: `Field Alert via ${scenario.carrierName}`,
    priority: 'STANDARD',
    status: 'SENT',
    createdAt: new Date().toISOString(),
  });

  for (const step of scenario.transitions) {
    console.log(`⏳ [SIMULATING NETWORK LATENCY] Waiting ${step.delayMs}ms...`);
    await sleep(step.delayMs);

    const payload: CarrierReceiptPayload = {
      trackingId,
      recipient: scenario.recipient,
      carrierStatus: step.status,
      carrierName: scenario.carrierName,
      carrierTimestamp: new Date().toISOString(),
      networkErrorCode: step.networkErrorCode,
    };

    console.log(`📨 [TRANSMITTING DLR WEBHOOK] -> Status: ${step.status} | Reason: ${step.networkErrorCode || 'OK'}`);
    const res = await postJson(WEBHOOK_PATH, payload);
    console.log(`   Response (${res.processingTimeMs || 0}ms): Normalized -> ${res.normalizedStatus || res.error}`);
  }
}

async function main() {
  const payloadsPath = path.join(__dirname, 'testPayloads.json');
  const scenarios: ScenarioConfig[] = JSON.parse(fs.readFileSync(payloadsPath, 'utf-8'));

  const argScenario = process.argv.find(arg => arg.startsWith('--scenario='))?.split('=')[1];

  if (argScenario) {
    const selected = scenarios.find(s => s.scenario === argScenario);
    if (!selected) {
      console.error(`Scenario "${argScenario}" not found. Available scenarios:`, scenarios.map(s => s.scenario).join(', '));
      process.exit(1);
    }
    await runScenario(selected);
  } else {
    console.log(`\n======================================================`);
    console.log(`  🌐 MobileTrust Relay - Carrier Network Simulator`);
    console.log(`======================================================`);
    console.log(`Running all test scenarios sequentially...\n`);

    for (const scenario of scenarios) {
      await runScenario(scenario);
      await sleep(1000);
    }
  }

  console.log(`\n✨ Simulation Completed Successfully.\n`);
}

main().catch(err => {
  console.error('[SIMULATOR ERROR]', err.message || err);
  console.log('\nTip: Make sure backend server is running first with: npm run dev\n');
});
