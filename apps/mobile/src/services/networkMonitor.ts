import { NETWORK_STATUS_CHECK_INTERVAL } from '@mobiletrust/shared';

export type NetworkStateListener = (isOnline: boolean) => void;

/**
 * Network monitor service to detect network connectivity changes.
 * Prevents duplicate events and provides listener subscriptions with clean unsubscription.
 */
export class NetworkMonitor {
  private online: boolean = true;
  private listeners: Set<NetworkStateListener> = new Set();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;

  constructor(initialOnlineState: boolean = true) {
    this.online = initialOnlineState;
  }

  /**
   * Returns current online status.
   */
  isOnline(): boolean {
    return this.online;
  }

  /**
   * Subscribes a listener callback to network state transitions.
   * Returns an unsubscribe function.
   */
  subscribe(listener: NetworkStateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Sets the network state. Emits events ONLY if the state actually changes (deduplication).
   */
  setOnline(newOnlineState: boolean): void {
    if (this.online === newOnlineState) {
      // Prevent duplicate transition events
      return;
    }

    this.online = newOnlineState;
    this.notifyListeners();
  }

  /**
   * Starts periodic polling or native event listening.
   */
  start(checkIntervalMs: number = NETWORK_STATUS_CHECK_INTERVAL): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Check if browser/RN navigator.onLine exists
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      this.setOnline(Boolean(navigator.onLine));
    }

    // Interval heartbeat
    if (checkIntervalMs > 0) {
      this.intervalId = setInterval(() => {
        if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
          this.setOnline(Boolean(navigator.onLine));
        }
      }, checkIntervalMs);
    }
  }

  /**
   * Stops the network monitor and clears listeners/timers.
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  /**
   * Clears all listeners.
   */
  clearListeners(): void {
    this.listeners.clear();
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.online);
      } catch (err) {
        console.error('Error executing network monitor listener:', err);
      }
    }
  }
}

// Global default instance
export const networkMonitor = new NetworkMonitor(true);
