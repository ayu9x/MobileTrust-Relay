import { EmergencyMessage } from '@mobiletrust/shared';

/**
 * SmsDispatcher
 * Bridge interface for native Android SMS logic (to be implemented by Harsh).
 */
export class SmsDispatcher {
  /**
   * Dispatches the SMS via native Android SmsManager or fallback.
   * Modifies the message payload to include the tracking footer.
   */
  static async dispatch(message: EmergencyMessage): Promise<boolean> {
    const trackingFooter = `\n[TRK:${message.id}]`;
    const finalContent = `${message.content}${trackingFooter}`;
    
    console.log(`[Native SMS Bridge] Sending to ${message.recipient}:`);
    console.log(finalContent);

    // TODO (Member 2): Hook into React Native NativeModules here.
    // e.g. return await NativeModules.SmsManager.send(message.recipient, finalContent);
    
    // Mock success for UI testing
    return new Promise(resolve => setTimeout(() => resolve(true), 500));
  }
}
