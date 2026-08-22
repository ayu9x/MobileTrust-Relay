export const RELAY_CONFIG = {
  MAX_RETRIES: 3,
  DEDUPLICATION_WINDOW_MS: 5 * 60 * 1000, // 5 minutes window
  STATUS_DISPLAY_LATENCY_MAX_SEC: 15,     // PRD: Display within 15s of receipt
  RELAY_PROCESSING_LATENCY_MAX_SEC: 30,  // PRD: Cloud relay must process within 30s
  MAX_STORAGE_BUDGET_BYTES: 15 * 1024 * 1024, // 15MB PRD limit
  OFFLINE_RETENTION_HOURS: 2,             // 2 hours offline capability
  DEFAULT_CARRIER: 'BSNL-DisasterRelief',
};

export const TRACKING_ID_PREFIX = 'MTR';
