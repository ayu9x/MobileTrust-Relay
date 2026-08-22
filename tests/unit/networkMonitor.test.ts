import { describe, expect, it, vi } from 'vitest';
import { NetworkMonitor } from '../../apps/mobile/src/services/networkMonitor.js';

describe('Network Monitor Service', () => {
  it('initializes with correct default online state', () => {
    const monitorOnline = new NetworkMonitor(true);
    expect(monitorOnline.isOnline()).toBe(true);

    const monitorOffline = new NetworkMonitor(false);
    expect(monitorOffline.isOnline()).toBe(false);
  });

  it('notifies subscribers upon network state transitions', () => {
    const monitor = new NetworkMonitor(false);
    const listener = vi.fn();

    monitor.subscribe(listener);
    monitor.setOnline(true);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(true);
    expect(monitor.isOnline()).toBe(true);
  });

  it('prevents duplicate transition events when network state has not changed', () => {
    const monitor = new NetworkMonitor(true);
    const listener = vi.fn();

    monitor.subscribe(listener);

    // Setting same state repeatedly
    monitor.setOnline(true);
    monitor.setOnline(true);
    monitor.setOnline(true);

    expect(listener).not.toHaveBeenCalled();

    // Transitioning state
    monitor.setOnline(false);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(false);

    // Setting false again
    monitor.setOnline(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes listeners cleanly without side effects', () => {
    const monitor = new NetworkMonitor(true);
    const listenerA = vi.fn();
    const listenerB = vi.fn();

    const unsubscribeA = monitor.subscribe(listenerA);
    monitor.subscribe(listenerB);

    unsubscribeA();

    monitor.setOnline(false);

    expect(listenerA).not.toHaveBeenCalled();
    expect(listenerB).toHaveBeenCalledTimes(1);
  });

  it('starts and stops gracefully without throwing', () => {
    const monitor = new NetworkMonitor(true);
    expect(() => {
      monitor.start(100);
      monitor.stop();
    }).not.toThrow();
  });
});
