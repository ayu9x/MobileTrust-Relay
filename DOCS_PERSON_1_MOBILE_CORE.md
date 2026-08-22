# Person 1: Mobile UI & Native SMS Dispatcher Blueprint
**Owner:** Developer 1 (Mobile Frontend Lead)  
**Assigned Scope:** User Interface, Screen Navigation, Native SMS Dispatch Bridge, Real-time Status Badge System, Audio/Visual Alert Triggers, and Storage-budgeted History View.  
**Exclusive Directory Access:** `apps/mobile/src/screens/`, `apps/mobile/src/components/`, `apps/mobile/src/native/`

---

## 1. Directory & File Isolation

To prevent merge conflicts, you must only create and modify files in:
```
apps/mobile/src/
├── screens/
│   ├── DispatchScreen.tsx          # Main emergency dispatch & message sender
│   ├── HistoryScreen.tsx           # History of sent messages with status
│   └── MessageDetailModal.tsx      # Detailed delivery lifecycle timeline
├── components/
│   ├── DeliveryStatusBadge.tsx     # Dynamic badge (QUEUED | SENT | DELIVERED | FAILED)
│   ├── PrioritySelector.tsx        # Urgent vs Low toggle
│   ├── RetryFailureBanner.tsx      # Critical 3-retry failure visual banner
│   └── NetworkIndicator.tsx        # Online / 2-Hour Offline state indicator
└── native/
    └── SmsDispatcher.ts            # Native SMS Intent / Bridge wrapper
```

---

## 2. Dependencies & Interface Contracts to Consume

Import types strictly from `packages/shared/src/types.ts` (created by Person 3) and consume the store interface:
```typescript
import { 
  EmergencyMessage, 
  DeliveryStatus, 
  MessagePriority 
} from '@mobiletrust/shared';
```

---

## 3. Detailed Step-by-Step Implementation Tasks

### Task 1.1: Main Emergency Dispatch Screen (`DispatchScreen.tsx`)
- **UI Elements:**
  - Recipient Phone Number Input (with Indian standard format validation `+91XXXXXXXXXX`).
  - Emergency Message Content Field (character counter, max 160 chars for single SMS segment).
  - Priority Selector (🔴 `HIGH_URGENT` / 🟡 `STANDARD`).
  - "Send Emergency Alert" CTA button with tactile loading state.
- **Workflow:**
  1. User types message & selects priority.
  2. Generates tracking ID format: `MTR-<TIMESTAMP>-<HASH4>` (or calls `crypto` service).
  3. Sends SMS via `SmsDispatcher.ts`.
  4. Appends message record to the local store with initial status `SENT`.

### Task 1.2: Native SMS Dispatch Bridge (`SmsDispatcher.ts`)
- Implements fallback logic:
  - Primary: Native SMS manager / Expo SMS `sendSMSAsync` or direct intent.
  - Generates SMS body with tracking footer:  
    `"EMERGENCY: Flooding at Ward 4. [TRK:MTR-172432-8F2B]"`
  - Emits event to store when SMS is dispatched or fails on device radio.

### Task 1.3: Real-Time Delivery Status Badge (`DeliveryStatusBadge.tsx`)
- Displays live status of each message within **< 15 seconds** of carrier receipt:
  - ⏳ `QUEUED_OFFLINE`: Orange pulsing badge (when device is disconnected).
  - 📨 `SENT_RADIO`: Blue badge (SMS transmitted from mobile cell tower).
  - 📡 `RELAYED_CLOUD`: Purple badge (Cloud relay acknowledged DLR).
  - ✅ `DELIVERED`: Solid green badge with delivery timestamp.
  - ❌ `FAILED_CARRIER`: Flashing red badge with retry counter (`Attempt X/3`).

### Task 1.4: 3-Retry Failure Alert Banner & Notification (`RetryFailureBanner.tsx`)
- **PRD Requirement**: *"Trigger a notification when a message fails to deliver after 3 retries."*
- Listens to store status updates.
- If `message.retryCount >= 3` and `status === 'FAILED'`, render:
  - Prominent red alert banner at top of screen with sound/vibration feedback.
  - "Resend via Alternative Carrier" and "Mark as Critical Dropout" action buttons.

### Task 1.5: Message History Screen (< 15MB Storage Budget) (`HistoryScreen.tsx`)
- Displays chronological list of sent messages.
- Filters: `All`, `Delivered`, `Failed / Needs Attention`.
- Storage guard: Display current local cache footprint (must display `< 15MB` budget badge).
- Tap message to open `MessageDetailModal.tsx` displaying the complete audit lifecycle (Timestamp created -> Dispatched -> Carrier DLR -> Cloud Relay Sync).

---

## 4. Code Snippet Template: `DeliveryStatusBadge.tsx`

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DeliveryStatus } from '@mobiletrust/shared';

interface Props {
  status: DeliveryStatus;
  retryCount?: number;
}

export const DeliveryStatusBadge: React.FC<Props> = ({ status, retryCount = 0 }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'DELIVERED':
        return { text: 'DELIVERED', bg: '#10B981', color: '#FFFFFF', icon: '✓' };
      case 'SENT':
        return { text: 'SENT (CARRIER)', bg: '#3B82F6', color: '#FFFFFF', icon: '→' };
      case 'QUEUED_OFFLINE':
        return { text: 'OFFLINE QUEUED', bg: '#F59E0B', color: '#000000', icon: '⏳' };
      case 'FAILED':
        return { 
          text: `FAILED (${retryCount}/3)`, 
          bg: '#EF4444', 
          color: '#FFFFFF', 
          icon: '⚠' 
        };
      default:
        return { text: 'UNKNOWN', bg: '#6B7280', color: '#FFFFFF', icon: '?' };
    }
  };

  const config = getBadgeConfig();

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.color }]}>
        {config.icon} {config.text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
```

---

## 5. Commit & Verification Checklist

- [x] `DispatchScreen` renders cleanly with keyboard avoiding behavior.
- [x] Priority tags (High / Low) toggle visual accent colors.
- [x] Delivery status badge updates within UI dynamically when store updates.
- [x] 3-retry failure trigger displays high-visibility alert banner.
- [x] Storage size indicator shows usage under 15MB.
- [x] Zero lint errors, zero direct writes outside `apps/mobile/src/screens/`, `components/`, `native/`.
