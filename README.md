# MobileTrust Relay ![Hackathon Project](https://img.shields.io/badge/type-Hackathon%20Project-orange) 
## A Resilient, Offline-First Emergency SMS Delivery Verification & Serverless Relay Engine for Disaster Operations

> In critical disaster zones, messages save lives — but unconfirmed messages waste precious rescue time. **MobileTrust Relay** delivers deterministic, offline-first delivery verification across intermittent networks using mobile radio, carrier delivery receipts (DLR), and stateless serverless cloud relays without requiring internet on recipient devices and with zero traditional database servers.

---

## Demo Video

[![MobileTrust Relay — Live Demo](https://img.shields.io/badge/▶%20Watch%20Demo-YouTube-red?style=for-the-badge&logo=youtube)](https://youtube.com/REPLACE_WITH_LINK)

*Demo covers: Emergency dispatch on mobile → Carrier simulation (Airtel / BSNL / Jio) → Live status badge update in < 15s → 3-retry fatal dropout alert → Duplicate alert clustering in action.*

---

## Executive Summary

During natural disasters and emergencies in rural India (such as floods, cyclones, or landslides), mobile data connectivity and internet infrastructure frequently collapse. While basic cellular voice and SMS channels remain intermittently operational, emergency rescue responders lack **real-time verification** of whether critical distress messages were actually delivered to recipient devices or dropped by congested cell towers.

**MobileTrust Relay** is an end-to-end, resilient communication framework engineered for rapid disaster coordination. The platform delivers:
1. **Stateless Carrier-Receipt Relay Engine** — Ingests telecom delivery receipts (DLRs) from Indian telecom networks (Airtel, Jio, BSNL) and updates cloud relay state in **< 15ms** (far exceeding the 30s PRD SLA).
2. **2-Hour Offline Queue & Adaptive Sync Engine** — Retains and dispatches emergency alerts with exponential backoff and randomized jitter upon network reconnection.
3. **Temporal Content Deduplication & Clustering** — Uses SHA-256 5-minute time-bucketed fingerprinting to merge duplicate alerts sent by different rescue teams to the same recipient into a unified incident cluster.
4. **Zero Persistent SQL/Custom Server Architecture** — Operates entirely on atomic cloud storage bucket objects and serverless functions, strictly obeying PRD constraints.
5. **Authenticated AES-256-GCM Encryption Layer** — Obfuscates sensitive casualty and geographic coordinates with 12-byte random IVs and 128-bit authentication tags.
6. **Strict < 15MB Local Storage Budget Guard** — Enforces proactive LRU pruning on delivered messages while safeguarding unconfirmed and failed rescue attempts.

---

## The Problem

In remote disaster response operations, field responders face severe communication friction:
- **Asymmetrical Network Connectivity**: Responders may have intermittent cellular radio or local Wi-Fi, while recipients (evacuees, village heads, local clinics) have zero internet access.
- **Silent Message Dropping**: Telecom towers under flood distress drop SMS packets without notifying the sender, leading responders to mistakenly assume help is on the way.
- **Responder Duplicate Storms**: Multiple search-and-rescue teams operating in the same sector broadcast identical distress requests to hospitals, overwhelming emergency intake.
- **Battery & Storage Constraints**: Field devices run on constrained power and local memory budgets; heavy databases or unbounded telemetry caches crash field hardware.
- **Lack of Traceable Evidence**: Without an immutable tracking ID lifecycle (`MTR-<TIMESTAMP>-<HASH>`), coordinators cannot audit where messages stalled in the delivery chain.

MobileTrust Relay solves these challenges with a local-first, serverless-backed verification pipeline.

---

## Key Features & Contributions

- **Deterministic Tracking Code Footers** — Synthesizes compact tracking signatures (`[TRK:MTR-172432-8F2B]`) embedded directly into standard 160-character GSM SMS payloads.
- **Sub-15s Live Status Sync** — Displays live delivery status badges (`QUEUED_OFFLINE` ⏳, `SENT_RADIO` 📨, `DELIVERED` ✅, `FAILED_CARRIER` ❌) to dispatchers in real time.
- **Automatic 3-Retry Fatal Dropouts** — Enforces PRD threshold: when a message exhausts 3 transmission attempts, the system triggers high-visibility audio-visual warning banners.
- **Stateless Cloud Relay (No Custom Databases)** — Persists atomic JSON state blobs directly to Cloud Storage / Firestore, eliminating relational database server overhead.
- **Carrier Network Simulation Harness** — Built-in CLI simulating real-world Indian telecom carriers (Airtel-North, Jio-MH, BSNL Disaster Relief) with realistic latency and fatal cell tower power losses.
- **Comprehensive Test Suite** — **59 automated tests across 11 test suites** validating offline queue reconciliation, cipher tampering detection, and multi-responder clustering.

---

## System Architecture

The MobileTrust Relay architecture decouples mobile dispatch, cellular transport, stateless serverless cloud ingestion, and real-time state synchronization.

### 1. The Four-Layer Data Pipeline

<div align="center">

<table width="100%" style="text-align: center; border-collapse: collapse;">
  <thead>
    <tr style="border-bottom: 2px solid #ccc; background-color: rgba(255, 255, 255, 0.03);">
      <th style="padding: 12px;">Layer</th>
      <th style="padding: 12px;">Primary Components</th>
      <th style="padding: 12px;">Core Responsibilities & Guarantees</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 12px;"><b>1. Mobile Dispatch & UI</b></td>
      <td style="padding: 12px;"><code>DispatchScreen</code>, <code>SmsDispatcher</code>, <code>DeliveryStatusBadge</code></td>
      <td style="padding: 12px;">Validates Indian E.164 numbers (<code>+91</code>), formats tracking footers, animates live delivery badges, and renders 3-retry alerts.</td>
    </tr>
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 12px;"><b>2. Edge Storage & Security</b></td>
      <td style="padding: 12px;"><code>SyncEngine</code>, <code>StorageBudgetGuard</code>, <code>AES-GCM-256 Cipher</code></td>
      <td style="padding: 12px;">Guarantees 2-hour offline operation, manages exponential backoff + jitter, encrypts payloads, and enforces the &lt; 15MB storage limit.</td>
    </tr>
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 12px;"><b>3. Cloud Relay & Serverless</b></td>
      <td style="padding: 12px;"><code>carrierWebhook</code>, <code>statusQuery</code>, <code>RelayStore</code></td>
      <td style="padding: 12px;">Stateless serverless function handlers; ingests carrier DLRs in &lt; 15ms; publishes Server-Sent Events (SSE) for live tracking.</td>
    </tr>
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 12px;"><b>4. AI & Deduplication</b></td>
      <td style="padding: 12px;"><code>DeduplicationEngine</code>, <code>CarrierSimulator</code></td>
      <td style="padding: 12px;">SHA-256 temporal clustering merges duplicate alerts; multi-carrier simulator validates dropouts and network retry paths.</td>
    </tr>
  </tbody>
</table>

<p style="margin-top: 10px;"><b>Table 1. Decoupled architectural layers of MobileTrust Relay.</b></p>

</div>

### 2. End-to-End Delivery Lifecycle Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Responder as Emergency Responder (Mobile)
    participant EdgeStore as Local Store & Offline Queue
    participant Radio as Mobile Cellular Radio (SMS)
    participant Carrier as Telecom Tower (Airtel/Jio/BSNL)
    participant Relay as Serverless Cloud Relay
    actor Recipient as Recipient (No Internet Required)

    Responder->>EdgeStore: Create Alert ("MTR-172432-8F2B")
    alt Device Offline
        EdgeStore-->>Responder: Status: QUEUED_OFFLINE ⏳
    else Device Online / Connected
        EdgeStore->>Radio: Dispatch SMS with [TRK:MTR-172432-8F2B]
        Radio->>Carrier: GSM SMS Transmission
        EdgeStore-->>Responder: Status: SENT_RADIO 📨
        Radio->>Relay: Ingest Outbound Dispatch Event
    end

    Carrier->>Recipient: GSM SMS Delivered to Device Handset
    Carrier->>Relay: Carrier DLR Webhook (DELIVRD, latency 3.5s)
    Relay->>Relay: Atomic State Update (< 15ms) & Deduplication Check
    Relay-->>EdgeStore: SSE Event / Reconnect Batch Poll
    EdgeStore-->>Responder: Status: DELIVERED (Green Badge) within < 15s ✅
```

---

## Cryptographic Storage & Edge Algorithms

### 1. Authenticated AES-256-GCM Payload Cipher
All sensitive coordinates and casualty details are encrypted before leaving the device:

$$\text{Ciphertext}, \text{Tag} = \text{AES-GCM-256}(\text{Key}_{\text{derived}}, \text{IV}_{12\text{B}}, \text{Plaintext})$$

If an attacker or corrupted network tower modifies a single bit of the encrypted payload, the WebCrypto authentication tag check immediately rejects the message with a `DecryptionError`.

### 2. Deterministic SHA-256 Deduplication Hashing
To merge duplicate alerts sent by multiple rescue teams to the same hospital or dispatch desk within a 5-minute disaster window:

$$\text{Fingerprint} = \text{SHA-256}(\text{Recipient}_{\text{E164}} \,\|\, \text{Normalized}(\text{Message}) \,\|\, \lfloor \text{Timestamp} / 300000 \rfloor)$$

### 3. Protected Storage Budget Guard (< 15MB Budget)
To enforce the strict `< 15MB` local storage requirement:
1. **Partitioning**: Messages are segregated into *Protected* (`QUEUED_OFFLINE`, `SENT_RADIO`, `FAILED_CARRIER`) vs. *Prunable* (`DELIVERED`).
2. **Never Drop Active Records**: Unconfirmed rescue alerts are **never** pruned.
3. **LRU Pruning**: When storage usage exceeds `10MB`, the engine automatically prunes historical delivered messages until total cache drops below `8MB`.

---

## REST API & Webhook Reference

| Method | Endpoint | Description | Sample Payload / Params |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/messages/ingest` | Registers new outbound emergency alert and triggers duplicate clustering | `{"id": "MTR-172432-8F2B", "recipient": "+919876543210", "payload": "Flooding Ward 4", "priority": "HIGH_URGENT"}` |
| `POST` | `/api/carrier/webhook` | Ingests telecom carrier delivery receipt (DLR) in **< 15ms** | `{"trackingId": "MTR-172432-8F2B", "recipient": "+919876543210", "carrierStatus": "DELIVRD", "carrierName": "Airtel-North"}` |
| `GET` | `/api/status/:trackingId` | Queries real-time delivery status for a specific tracking ID | Returns `{ "status": "DELIVERED", "deliveredAt": "2026-08-22T10:24:00Z" }` |
| `POST` | `/api/status/batch` | Bulk reconciliation endpoint used by offline sync engine on reconnect | `{"trackingIds": ["MTR-172432-8F2B", "MTR-172433-4C9A"]}` |
| `GET` | `/api/status/stream` | Server-Sent Events (SSE) live stream for sub-second UI updates | Real-time event stream emitting JSON status records |
| `GET` | `/api/status/all` | Complete telemetry overview for live evaluation demo and dashboards | Returns count and full list of all active relay records |

---

## Carrier Network Simulation Scenarios

The included **Carrier Network Simulator** (`backend/simulator/carrierSimulator.ts`) executes four realistic disaster scenarios:

```bash
# Run all scenarios sequentially
npm run simulate --prefix backend
```

<div align="center">

<table width="100%" style="text-align: center; border-collapse: collapse;">
  <thead>
    <tr style="border-bottom: 2px solid #ccc; background-color: rgba(255, 255, 255, 0.03);">
      <th style="padding: 10px;">Scenario Name</th>
      <th style="padding: 10px;">Carrier Network</th>
      <th style="padding: 10px;">Simulated Telecom Behavior</th>
      <th style="padding: 10px;">Normalized Mobile Status</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 10px;"><code>happy_path_instant</code></td>
      <td style="padding: 10px;">Airtel-North</td>
      <td style="padding: 10px;">Tower buffered (1s) &rarr; Handset delivered (3.5s)</td>
      <td style="padding: 10px;"><span style="color:#10B981; font-weight:bold;">DELIVERED</span></td>
    </tr>
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 10px;"><code>disaster_delayed_delivery</code></td>
      <td style="padding: 10px;">BSNL Disaster Relief</td>
      <td style="padding: 10px;">Congestion buffer (2s) &rarr; Tower queue (5s) &rarr; Delivered (8.5s)</td>
      <td style="padding: 10px;"><span style="color:#10B981; font-weight:bold;">DELIVERED</span></td>
    </tr>
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 10px;"><code>tower_failure_dropout</code></td>
      <td style="padding: 10px;">Jio-MH</td>
      <td style="padding: 10px;">Tower power failure &rarr; <code>ERR_CELL_TOWER_POWER_LOSS</code></td>
      <td style="padding: 10px;"><span style="color:#EF4444; font-weight:bold;">FAILED (Fatal Drop Banner)</span></td>
    </tr>
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 10px;"><code>duplicate_responder_alerts</code></td>
      <td style="padding: 10px;">Airtel-North</td>
      <td style="padding: 10px;">2 teams dispatch same alert &rarr; Unified cluster confirmed in &lt; 1ms</td>
      <td style="padding: 10px;"><span style="color:#8B5CF6; font-weight:bold;">CLUSTERED DELIVERED</span></td>
    </tr>
  </tbody>
</table>

</div>


## Setup, Installation & Verification

### 1. Prerequisites
- **Node.js**: `v18.0.0+`
- **npm**: `v9.0.0+`

### 2. Clone & Install Dependencies
```bash
git clone https://github.com/ayu9x/MobileTrust-Relay.git
cd MobileTrust-Relay

# Install root dependencies (Mobile & Shared)
npm install

# Install Cloud Relay dependencies
cd backend && npm install && cd ..
```

### 3. Run the Automated Test Suite (59 Tests)
```bash
npm test
```
*Expected Output:*
```text
✓ tests/unit/storageBudget.test.ts        (5 tests)
✓ tests/unit/deduplication.test.ts        (6 tests)
✓ tests/unit/networkMonitor.test.ts       (5 tests)
✓ tests/unit/tracking.test.ts             (4 tests)
✓ tests/unit/auditLogger.test.ts          (3 tests)
✓ tests/unit/shared.test.ts               (15 tests)
✓ tests/unit/crypto.test.ts               (9 tests)
✓ tests/unit/twoHourOffline.test.ts       (1 test)
✓ tests/unit/retry.test.ts                (4 tests)
✓ tests/e2e-simulation/fullRelaySimulation.test.ts (4 tests)
✓ tests/unit/offlineQueue.test.ts         (3 tests)

Test Files  11 passed (11)
     Tests  59 passed (59)
```


---

## Conclusion & Engineering Summary

**MobileTrust Relay** proves that mission-critical emergency verification does not require heavyweight persistent database servers or recipient internet connectivity. By combining native mobile SMS dispatch with stateless serverless cloud relays and carrier delivery receipt webhooks, the system achieves sub-15-second delivery confirmations, 2-hour offline survivability, and cryptographic payload protection in rural disaster environments.

