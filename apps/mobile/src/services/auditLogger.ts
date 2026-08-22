import { AuditEvent, AuditEventType, STORAGE_KEYS } from '@mobiletrust/shared';
import { getStorage } from './asyncStorage';

/**
 * Sanitizes metadata to ensure no sensitive plaintext payloads or encryption keys are logged.
 */
function sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();
    // Block any field that might contain plaintext payload, passphrase, or key
    if (
      lowerKey.includes('payload') ||
      lowerKey.includes('body') ||
      lowerKey.includes('plaintext') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('key') ||
      lowerKey.includes('passphrase')
    ) {
      sanitized[key] = '[REDACTED_SENSITIVE_DATA]';
    } else if (lowerKey.includes('phone') || lowerKey.includes('recipient')) {
      // Mask phone number for privacy
      const strVal = String(value);
      if (strVal.length > 5) {
        sanitized[key] = `${strVal.slice(0, 3)}****${strVal.slice(-3)}`;
      } else {
        sanitized[key] = '[REDACTED_PHONE]';
      }
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export class AuditLogger {
  private events: AuditEvent[] = [];
  private maxMemoryEvents: number = 500;

  constructor(maxMemoryEvents: number = 500) {
    this.maxMemoryEvents = maxMemoryEvents;
  }

  /**
   * Records a structured audit event.
   * Ensures all sensitive payload and key data are strictly sanitized before storing.
   */
  async log(
    eventType: AuditEventType,
    trackingId?: string,
    metadata?: Record<string, unknown>
  ): Promise<AuditEvent> {
    const event: AuditEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      eventType,
      trackingId,
      timestamp: new Date().toISOString(),
      metadata: sanitizeMetadata(metadata),
    };

    this.events.push(event);

    if (this.events.length > this.maxMemoryEvents) {
      this.events = this.events.slice(-this.maxMemoryEvents);
    }

    // Persist asynchronously
    await this.persist();
    return event;
  }

  /**
   * Retrieves logged audit events, optionally filtered by trackingId.
   */
  getEvents(trackingId?: string): AuditEvent[] {
    if (trackingId) {
      return this.events.filter((e) => e.trackingId === trackingId);
    }
    return [...this.events];
  }

  /**
   * Clears audit logs.
   */
  async clear(): Promise<void> {
    this.events = [];
    const storage = getStorage();
    await storage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
  }

  /**
   * Loads persisted audit events from storage.
   */
  async loadPersisted(): Promise<void> {
    try {
      const storage = getStorage();
      const raw = await storage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.events = parsed;
        }
      }
    } catch {
      // Gracefully recover on corrupt storage
      this.events = [];
    }
  }

  private async persist(): Promise<void> {
    try {
      const storage = getStorage();
      await storage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(this.events));
    } catch {
      // Ignore storage errors during non-critical logging
    }
  }
}

// Global default instance
export const auditLogger = new AuditLogger();
