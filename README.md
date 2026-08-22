# 🛡️ MobileTrust Relay

MobileTrust Relay is an ultra-resilient, offline-first emergency dispatch communication application built for scenarios where standard data connectivity is compromised or non-existent (e.g., natural disasters, network blackouts).

## ✨ Features

- **Offline-First Resilience**: Messages are queued locally via `AsyncStorage` when completely disconnected.
- **Direct Carrier Radio Transmission**: Bypasses data networks completely by interfacing directly with native Android/iOS SMS managers for high-priority dispatch.
- **Firebase Cloud Sync**: Automatically syncs message state and delivery receipts back to the cloud once data connectivity is restored.
- **AES-256 Encryption**: Every payload is symmetrically encrypted before transit, ensuring sensitive emergency data remains confidential.
- **Duplicate Message Detection**: Intelligent debouncing alerts you if you accidentally attempt to spam the same message to a recipient within a 5-minute window.
- **Priority Routing**: Tag messages as `STANDARD` or `HIGH_URGENT`. Urgent messages are prioritized in the UI and routing queues.
- **Ultra-Minimalist Aesthetic**: Designed with a chic, pitch-black minimalist interface inspired by premium, modern design languages.

## 🏗️ Architecture

- **Frontend**: React Native, utilizing a highly customized, borderless design system.
- **Navigation**: React Navigation v6 (configured without native screens to ensure Fabric compatibility).
- **Backend Sync**: `@react-native-firebase/firestore`.
- **Native Modules**: Includes bridging to native Kotlin/Swift carrier subsystems (`SmsDispatcher`).

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Ruby and CocoaPods (for iOS)
- Android Studio / Xcode

### Installation
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. (iOS Only) Install pods with static framework compatibility:
   ```bash
   cd ios && pod install && cd ..
   ```

### Running the App

**Start Metro Bundler:**
```bash
npm start -- --reset-cache
```

**Run on Android:**
```bash
npm run android
```

**Run on iOS:**
*(Note: Requires active iOS simulator runtime configured via Xcode Components)*
```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer npm run ios
```

## 📝 License
Proprietary. All rights reserved.
