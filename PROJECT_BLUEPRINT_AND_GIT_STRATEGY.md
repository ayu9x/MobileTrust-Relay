# MobileTrust Relay — Master Architecture & Team Sprint Blueprint
**Time Budget:** 4–5 Hours | **Team Size:** 3 Developers | **Target:** 100% PRD & Evaluation Rubric Compliance

---

## 1. Selected MVP Tech Stack

| Layer | Technology | Rationale & Justification |
| :--- | :--- | :--- |
| **Mobile App** | **React Native (Expo SDK 51+) + TypeScript** | Rapid cross-platform UI, native SMS bridge support, unified TypeScript contracts with backend. |
| **Local State & Storage** | **AsyncStorage + Zustand / Lightweight Reactive Store** | Fast key-value persistence (<15MB limit enforced), zero boilerplate, offline-first queueing. |
| **Cloud Relay** | **Firebase Serverless (Cloud Functions v2 + Cloud Firestore / Storage)** | Meets PRD constraint: *"No backend servers or persistent SQL DBs — only cloud storage & serverless functions"*. |
| **Carrier SMS / DLR Relay** | **Carrier Delivery Receipt Webhook API + Local Mock Carrier Simulator** | Ingests carrier DLRs (Sent, Buffered, Delivered, Failed) in <30s. |
| **Security / Encryption** | **Lightweight AES-256-GCM / Web Crypto + HMAC-SHA256** | Zero-dependency payload obfuscation & tracking hash to protect sensitive rescue coordinates. |
| **Contract Validation** | **Zod + Shared TypeScript DTOs (`packages/shared`)** | Strict contracts between mobile app and serverless cloud functions. |
| **Testing & CI** | **Vitest / Jest + Network Drop CLI Simulation Suite** | Validates 3-retry threshold, offline queue reconciliation, and carrier latency limits. |

---

## 2. Directory Isolation Architecture (Guaranteed Zero Git Conflicts)

```
ascend-2026-round-2/
├── PRD.md
├── PROJECT_BLUEPRINT_AND_GIT_STRATEGY.md
├── DOCS_PERSON_1_MOBILE_CORE.md
├── DOCS_PERSON_2_CLOUD_RELAY.md
├── DOCS_PERSON_3_OFFLINE_SECURITY_TESTS.md
├── packages/
│   └── shared/                       <-- [PERSON 3 OWNER] Types, Schemas, Constants
│       ├── src/
│       │   ├── types.ts              <-- Source of Truth for Data Contracts
│       │   ├── schemas.ts            <-- Zod Schemas for Validation
│       │   └── constants.ts          <-- Status Enums & Timeout Constants
│       └── package.json
├── apps/
│   └── mobile/                       <-- [PERSON 1 & PERSON 3 ISOLATED SUBFOLDERS]
│       ├── src/
│       │   ├── screens/              <-- [PERSON 1 ONLY] UI Screens & Visual State
│       │   ├── components/           <-- [PERSON 1 ONLY] UI Badges, Cards, Modals
│       │   ├── native/               <-- [PERSON 1 ONLY] SMS Dispatcher Bridge
│       │   ├── services/             <-- [PERSON 3 ONLY] Sync Engine, Offline Queue
│       │   ├── crypto/               <-- [PERSON 3 ONLY] Payload Cipher & Key Mgr
│       │   └── store/                <-- [PERSON 1 & 3 CONTRACT INTERFACE]
│       └── package.json
├── backend/                          <-- [PERSON 2 EXCLUSIVE OWNER]
│   ├── functions/                    <-- [PERSON 2 ONLY] Serverless Webhook & Query APIs
│   ├── simulator/                    <-- [PERSON 2 ONLY] Mock Carrier SMS & DLR Daemon
│   └── firebase.json
└── tests/                            <-- [PERSON 3 EXCLUSIVE OWNER]
    ├── unit/
    └── e2e-simulation/
```

---

## 3. Team Responsibilities & Ownership Matrix

| Developer | Core Domain | Assigned Workspace Folders | Core Output Deliverables |
| :--- | :--- | :--- | :--- |
| **Person 1 (Dev 1)** | **Mobile Frontend & Native SMS Engine** | `apps/mobile/src/screens/`<br>`apps/mobile/src/components/`<br>`apps/mobile/src/native/` | • Emergency Dispatch UI & Priority Selector<br>• Real-time Delivery Status Badges (<15s display)<br>• Message History Screen (<15MB storage)<br>• 3-Retry Failure Alert Banner & Audio/Vibrate Alert<br>• Native SMS Dispatcher wrapper |
| **Person 2 (Dev 2)** | **Cloud Relay & Serverless Carrier Engine** | `backend/functions/`<br>`backend/simulator/`<br>`backend/relay/` | • Serverless Cloud Relay Functions (Stateless)<br>• Carrier Delivery Receipt (DLR) Ingestion Webhook<br>• Duplicate Message Detection & Merging Algorithm<br>• Real-time Cloud Status Dispatch (Firestore/Storage event)<br>• Carrier DLR Simulation Script |
| **Person 3 (Dev 3)** | **Offline Sync, Security, Shared Types & E2E Testing** | `packages/shared/`<br>`apps/mobile/src/services/`<br>`apps/mobile/src/crypto/`<br>`tests/` | • Shared TypeScript Contracts & Zod Schemas<br>• 2-Hour Offline Queue & Exponential Backoff Sync Engine<br>• Lightweight AES/XOR Encryption & HMAC Hasher<br>• Automated Test Suite (Offline drop simulation, 3-retry alerts)<br>• Audit Logger & Telemetry Trace |

---

## 4. Git Collaboration Protocol

1. **Step 1 (First 15 Minutes)**: Person 3 commits `packages/shared/src/types.ts`. Person 1 and Person 2 pull `main`.
2. **Step 2 (Feature Branches)**:
   - Person 1 commits to `feat/person1-mobile-ui`
   - Person 2 commits to `feat/person2-cloud-relay`
   - Person 3 commits to `feat/person3-sync-crypto-tests`
3. **Step 3 (Continuous Commits)**: Commit small atomic chunks (e.g. `feat(mobile): add message history card`, `feat(relay): add carrier dlr webhook`).
4. **Step 4 (Zero-Conflict Guarantee)**: Because each person works in strictly disjunct directory paths and agreed-upon interfaces in `packages/shared`, branches merge cleanly into `main` without file collisions.

---

## 5. Alignment with the 6 Engineering Evaluation Dimensions

1. **Problem Framing & Architecture**: Stateless carrier receipt correlation, cloud relay fallback without persistent SQL servers, low-bandwidth edge caching.
2. **AI Native Workflow & Orchestration**: AI-assisted message triage/priority tagging and automated test vector synthesis.
3. **Implementation Quality**: Strict TypeScript types, defensive error boundaries, responsive feedback (<15s display latency).
4. **Testing & AI Output Verification**: Synthetic multi-agent network drop test suite (2-hour offline simulator, 3-retry drop alert verification).
5. **Debugging & Root Cause Analysis**: Unique tracking ID correlation across SMS -> Cloud Relay -> Mobile Client with structured audit logs.
6. **Security, Privacy, Ownership**: Lightweight payload encryption, tamper-proof hashes, zero PII persistence in plaintext.
