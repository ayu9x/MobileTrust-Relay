# MobileTrust Relay

# MobileTrust Relay

Title:
MobileTrust Relay

Background:
In rural India, mobile network outages during emergencies disrupt critical communication. Emergency responders rely on SMS and voice calls, but lack real-time verification of whether messages were delivered or received. This creates confusion and delays in coordinated rescue operations.

Problem Statement:
During disaster response, emergency teams need to confirm message delivery across unreliable networks. A responder sends a message via SMS, but the recipient may not receive it due to network dropouts. Without confirmation, teams waste time re-sending messages or assume delivery failed. This leads to miscommunication and delayed actions. The challenge is to build a mobile-based system that verifies message delivery status using only mobile and cloud infrastructure, without requiring internet connectivity on the recipient’s device.

Scope:
Build a mobile app that enables emergency responders to send messages with delivery verification. The system must work in low-connectivity environments and provide real-time feedback on whether a message was delivered or not. The solution must use only mobile and cloud resources — no backend servers or persistent databases.

MVP Scope:
• Develop a mobile app (Android/iOS) that allows users to send emergency messages via SMS with a delivery verification request.
• Implement a cloud-based relay service (using Firebase or AWS S3 + Lambda) to track message delivery status.
• Use SMS delivery receipts (via carrier APIs) to update the cloud state.
• Display real-time delivery status (sent, delivered, failed) in the mobile app.
• Ensure the app works offline and syncs delivery status when connectivity resumes.

Advanced/Bonus Scope:
• Add a feature to detect and merge duplicate messages sent by different users to the same recipient.
• Implement a lightweight encryption layer for sensitive messages.
• Support message prioritization based on urgency level (e.g., high/low).

Functional Requirements:
- Send an SMS message from the mobile app with a unique delivery tracking ID.
- Track the delivery status of the SMS using carrier delivery receipts.
- Update the cloud database with the delivery status (delivered/failed) when receipt is received.
- Display the delivery status (sent, delivered, failed) in the mobile app UI.
- Sync offline message attempts when network connectivity is restored.
- Allow users to view a history of sent messages and their delivery status.
- Trigger a notification when a message fails to deliver after 3 retries.

Non-Functional Requirements:
- The app must display delivery status within 15 seconds of receiving the carrier receipt.
- The cloud relay must process delivery updates within 30 seconds of receipt.
- The app must function with no internet connectivity for at least 2 hours.
- The system must handle at least 5 concurrent users sending messages simultaneously.
- The app must use <15MB of local storage for message history.

Constraints:
- No backend server or database is allowed — only cloud storage and serverless functions.
- All message tracking must be stateless and rely on SMS delivery receipts.
- The MVP must be fully functional within 6 hours of development.
- No use of third-party APIs beyond SMS and cloud services.
- All UI must be built using mobile-native frameworks (React Native or Flutter).

Deliverables:
- A working mobile app (APK/IPA) that sends SMS with delivery tracking.
- A cloud-based relay system that updates delivery status.
- A demo video showing message delivery tracking in real-time.
- A live demo of the app sending and receiving delivery status.
- A GitHub repository with code and deployment instructions.
