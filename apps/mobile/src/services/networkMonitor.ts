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
   * Probes active internet connectivity to detect real offline / Airplane Mode.
   */
  async checkConnectivity(): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1200);
    try {
      const res = await fetch('https://clients3.google.com/generate_204', {
        method: 'HEAD',
        signal: controller.signal,
      });
      const isConnected = res.status >= 200 && res.status < 400;
      this.setOnline(isConnected);
      return isConnected;
    } catch {
      this.setOnline(false);
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Starts periodic polling or native event listening.
   */
  start(checkIntervalMs: number = 2000): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Immediate check
    this.checkConnectivity().catch(() => {});

    // Periodic heartbeat probe
    if (checkIntervalMs > 0) {
      this.intervalId = setInterval(() => {
        this.checkConnectivity().catch(() => {});
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
