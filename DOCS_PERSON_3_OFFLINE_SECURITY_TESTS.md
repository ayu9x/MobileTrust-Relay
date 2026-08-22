# Person 3: Shared Types, Offline Sync, Encryption & Test Suite Blueprint
**Owner:** Developer 3 (Systems Architecture, Security & QA Lead)  
**Assigned Scope:** Shared TypeScript Contracts & Zod Schemas, 2-Hour Offline Sync Queue, Lightweight Payload Encryption, E2E Network Simulation Tests, and Rubric Compliance Audit.  
**Exclusive Directory Access:** `packages/shared/`, `apps/mobile/src/services/`, `apps/mobile/src/crypto/`, `apps/mobile/src/store/`, `tests/`

---

## 1. Directory & File Isolation

To prevent merge conflicts, you must only create and modify files in:
```
packages/shared/
├── src/
│   ├── types.ts                    # Canonical data types for Mobile & Cloud
│   ├── schemas.ts                  # Zod validation schemas
│   └── constants.ts                # App timeouts, retry limits, storage limits
└── package.json
apps/mobile/src/
├── services/
│   ├── syncEngine.ts               # Offline queue manager & auto-reconciliation
│   ├── networkMonitor.ts           # Connectivity listener (online / offline transition)
│   └── storageBudget.ts            # Enforces <15MB storage pruning
├── crypto/
│   ├── cipher.ts                   # Lightweight AES/XOR payload encryption
│   └── hash.ts                     # Tracking ID generator & HMAC checksums
└── store/
    └── messageStore.ts             # State store interface consumed by Person 1
tests/
├── unit/
│   ├── deduplication.test.ts       # Validates merge logic
│   ├── encryption.test.ts          # Validates cipher roundtrip & tampering
│   └── syncQueue.test.ts           # Validates 2-hour offline backoff & 3-retry alert
└── e2e-simulation/
    └── fullRelaySimulation.test.ts # End-to-end multi-user message relay test
```

---

## 2. Minute 0–15 Priority: `packages/shared/src/types.ts`

**CRITICAL:** Commit and push this file first so Person 1 and Person 2 can code against stable contracts!

```typescript
export type DeliveryStatus = 
  | 'QUEUED_OFFLINE' 
  | 'SENT' 
  | 'DELIVERED' 
  | 'FAILED';

export type MessagePriority = 'HIGH_URGENT' | 'STANDARD';

export interface EmergencyMessage {
  id: string;                      // Tracking ID, e.g. "MTR-172432-8F2B"
  recipient: string;               // E.164 phone format "+91XXXXXXXXXX"
  payload: string;                 // Plaintext or encrypted ciphertext
  isEncrypted: boolean;
  priority: MessagePriority;
  status: DeliveryStatus;
  retryCount: number;
  maxRetries: number;              // Fixed to 3 per PRD
  createdAt: string;               // ISO 8601
  updatedAt: string;
  deliveredAt?: string;
  failureReason?: string;
  mergedWithId?: string;           // Populated if deduplicated
}

export interface CarrierReceiptPayload {
  trackingId: string;
  recipient: string;
  carrierStatus: 'DELIVRD' | 'UNDELIV' | 'EXPIRED' | 'ACCEPTD';
  carrierTimestamp: string;
  networkErrorCode?: string | null;
}
```

---

## 3. Detailed Step-by-Step Implementation Tasks

### Task 3.1: 2-Hour Offline Queue & Sync Engine (`syncEngine.ts`)
- **PRD Non-Functional Requirement**: *"The app must function with no internet connectivity for at least 2 hours."*
- **PRD Functional Requirement**: *"Sync offline message attempts when network connectivity is restored."*
- Implements persistent queue using AsyncStorage.
- When offline:
  - Enqueues messages with status `QUEUED_OFFLINE`.
  - Dispatches local SMS via cellular radio if cell tower is active even without mobile data/internet.
- When network reconnects:
  - Batches unconfirmed tracking IDs and queries Cloud Relay (`POST /api/status/batch`).
  - Reconciles missing delivery receipts.
  - Retries any failed sync attempts using exponential backoff with jitter.

### Task 3.2: Lightweight Encryption & Tracking ID Generation (`cipher.ts`, `hash.ts`)
- **PRD Advanced Scope**: *"Implement a lightweight encryption layer for sensitive messages."*
- Uses lightweight AES-GCM or authenticated XOR stream cipher with pre-shared emergency responder operational key (`RESCOPS-2026-KEY`).
- Generates compact tracking codes: `MTR-` + 6-digit timestamp + 4-char CRC/SHA-256 slice (fits easily into 160-char SMS).

### Task 3.3: Storage Guard (< 15MB Budget) (`storageBudget.ts`)
- **PRD Non-Functional Requirement**: *"The app must use <15MB of local storage for message history."*
- Calculates total byte size of stored message history.
- Implements automated LRU compaction when storage exceeds 10MB (pruning delivered message metadata while retaining tracking hashes).

### Task 3.4: Automated Test Suite (`tests/`)
- Demonstrates verifiable engineering evidence across Evaluation Dimensions 04 (Testing) & 05 (Root Cause Analysis):
  - `syncQueue.test.ts`: Verifies that offline messages persist for 2 simulated hours and auto-flush on reconnect.
  - `retryAlert.test.ts`: Asserts that `message.retryCount === 3` triggers the fatal failure state and alert handler.
  - `encryption.test.ts`: Proves cipher integrity and tamper rejection.

---

## 4. Code Snippet Template: `syncEngine.ts`

```typescript
import { EmergencyMessage, DeliveryStatus } from '@mobiletrust/shared';

export class SyncEngine {
  private queue: EmergencyMessage[] = [];
  private isOnline: boolean = false;

  public setOnlineStatus(online: boolean) {
    this.isOnline = online;
    if (online) {
      this.flushQueue();
    }
  }

  public async enqueue(message: EmergencyMessage): Promise<void> {
    this.queue.push(message);
    if (this.isOnline) {
      await this.syncMessageWithCloud(message);
    }
  }

  public async flushQueue(): Promise<void> {
    console.log(`[SYNC ENGINE] Flushing ${this.queue.length} offline messages to Cloud Relay...`);
    const pending = this.queue.filter(m => m.status === 'QUEUED_OFFLINE' || m.status === 'SENT');

    for (const msg of pending) {
      try {
        await this.syncMessageWithCloud(msg);
      } catch (err) {
        msg.retryCount += 1;
        if (msg.retryCount >= 3) {
          msg.status = 'FAILED';
          msg.failureReason = 'Max retries (3) exceeded on network reconnect';
        }
      }
    }
  }

  private async syncMessageWithCloud(msg: EmergencyMessage): Promise<void> {
    // Calls Person 2's cloud endpoint to fetch latest carrier status
    console.log(`[SYNC ENGINE] Synchronized ${msg.id}`);
  }
}
```

---

## 5. Commit & Verification Checklist

- [ ] `packages/shared/src/types.ts` pushed first.
- [ ] Offline queue stores messages persistently during 2-hour offline simulation.
- [ ] 3-retry threshold correctly transitions message to `FAILED`.
- [ ] Storage monitor enforces <15MB limit.
- [ ] All unit tests pass with `npm test` (`vitest run`).
