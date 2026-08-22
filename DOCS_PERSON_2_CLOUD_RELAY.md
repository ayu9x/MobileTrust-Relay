# Person 2: Cloud Relay & Serverless Carrier Engine Blueprint
**Owner:** Developer 2 (Backend & Cloud Serverless Lead)  
**Assigned Scope:** Serverless Cloud Relay, Carrier Delivery Receipt (DLR) Webhook Ingestion, Duplicate Detection Algorithm, Real-time Relay Sync, and Mock Carrier Network Simulator.  
**Exclusive Directory Access:** `backend/functions/`, `backend/simulator/`, `backend/relay/`

---

## 1. Directory & File Isolation

To prevent merge conflicts, you must only create and modify files in:
```
backend/
├── functions/
│   ├── index.ts                     # Serverless function entry points (Firebase / Lambda)
│   ├── handlers/
│   │   ├── carrierWebhook.ts        # Carrier DLR Webhook receiver (<30s processing)
│   │   ├── statusQuery.ts           # Stateless status polling / batch query endpoint
│   │   └── deduplication.ts         # Duplicate message detector & merger
│   └── tsconfig.json
├── simulator/
│   ├── carrierSimulator.ts          # CLI daemon simulating Indian telecom carriers (Airtel/Jio)
│   ├── testPayloads.json            # Sample delivery receipts & drop vectors
│   └── run-simulator.sh
└── firebase.json                    # Serverless deployment / emulator configuration
```

---

## 2. Constraints from PRD to Strictly Enforce

- **PRD Non-Functional Requirement**: *"The cloud relay must process delivery updates within 30 seconds of receipt."*
- **PRD Constraint**: *"No backend server or database is allowed — only cloud storage and serverless functions."*
- **PRD Constraint**: *"All message tracking must be stateless and rely on SMS delivery receipts."*

---

## 3. Detailed Step-by-Step Implementation Tasks

### Task 2.1: Carrier Delivery Receipt (DLR) Webhook (`carrierWebhook.ts`)
- Accepts standard carrier delivery receipt payloads (e.g., Twilio / Indian SMS Gateway / Custom DLR format):
  ```json
  {
    "trackingId": "MTR-172432-8F2B",
    "recipient": "+919876543210",
    "carrierStatus": "DELIVRD", // or "UNDELIV", "EXPIRED", "REJECTD"
    "carrierTimestamp": "2026-08-22T10:24:00Z",
    "networkErrorCode": null
  }
  ```
- Normalizes carrier status to `DELIVERED` or `FAILED`.
- Writes the state transition to Cloud Storage / Firestore document at `/relays/{trackingId}.json` with zero relational database overhead.

### Task 2.2: Duplicate Message Detection & Merging Algorithm (`deduplication.ts`)
- **PRD Advanced Scope**: *"Add a feature to detect and merge duplicate messages sent by different users to the same recipient."*
- Computes content hash: `SHA256(recipient + normalizedMessageBody + 5minTimeBucket)`.
- If an active relay exists with the same content hash within the 5-minute window:
  - Links tracking IDs together into a merged parent cluster.
  - Updates all linked mobile clients with a single unified carrier delivery receipt.

### Task 2.3: Stateless Query / Event Stream Endpoint (`statusQuery.ts`)
- Endpoint: `GET /api/status?trackingId=MTR-172432-8F2B` or `POST /api/status/batch`
- Returns latest delivery status, timestamp, carrier confirmation code, and duplicate merge metadata.
- Enables Firestore real-time snapshot listener or lightweight HTTPS polling for mobile client.

### Task 2.4: Carrier SMS & Delivery Receipt Simulator (`carrierSimulator.ts`)
- Critical for live demonstration and automated judging:
  - Generates synthetic carrier delivery events with configurable network latency (2s to 12s).
  - Simulates 3 realistic scenarios:
    1. **Happy Path:** Sent -> Tower Buffered -> Delivered (Receipt received in 4s).
    2. **Temporary Dropout:** Tower Retry 1 -> Tower Retry 2 -> Delivered.
    3. **Fatal Dropout:** Network Outage -> 3 Retries Failed -> `UNDELIV` status emitted.
- Supports CLI command: `npx ts-node carrierSimulator.ts --scenario=dropout --trackingId=MTR-172432-8F2B`.

---

## 4. Code Snippet Template: `carrierWebhook.ts`

```typescript
import { Request, Response } from 'express';
import { DeliveryStatus, CarrierReceiptPayload } from '@mobiletrust/shared';

// Stateless Cloud Storage / Firestore updater
export const handleCarrierWebhook = async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const payload = req.body as CarrierReceiptPayload;
    const { trackingId, carrierStatus, recipient, timestamp } = payload;

    if (!trackingId || !carrierStatus) {
      return res.status(400).json({ error: 'Missing trackingId or carrierStatus' });
    }

    // Normalize carrier status
    const normalizedStatus: DeliveryStatus = 
      carrierStatus === 'DELIVRD' ? 'DELIVERED' : 'FAILED';

    const relayRecord = {
      trackingId,
      recipient,
      status: normalizedStatus,
      rawCarrierStatus: carrierStatus,
      updatedAt: timestamp || new Date().toISOString(),
      processedInMs: Date.now() - startTime,
    };

    // Store in Cloud Storage/Firestore relay bucket (stateless atomic write)
    console.log(`[CLOUD RELAY] Processed DLR for ${trackingId} -> ${normalizedStatus} in ${relayRecord.processedInMs}ms`);

    return res.status(200).json({ success: true, record: relayRecord });
  } catch (err: any) {
    console.error('[CLOUD RELAY ERROR]', err);
    return res.status(500).json({ error: 'Internal relay processing failure' });
  }
};
```

---

## 5. Commit & Verification Checklist

- [ ] Cloud Function endpoint responds in < 150ms.
- [ ] Carrier DLR normalization handles `DELIVRD`, `UNDELIV`, and `EXPIRED`.
- [ ] Duplicate message clustering correctly merges identical messages within 5-minute window.
- [ ] Carrier Simulator CLI successfully runs all 3 test scenarios.
- [ ] Code strictly resides in `backend/` without any cross-modifications in `apps/mobile/`.
