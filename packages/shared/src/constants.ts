/**
 * MobileTrust Relay - Canonical Constants
 * Central source of truth for limits, intervals, thresholds, and configurations.
 */

/**
 * Maximum number of retry attempts for failed synchronizations before marking FAILED.
 */
export const MAX_RETRIES = 3;

/**
 * Maximum offline queue support duration in hours.
 */
export const OFFLINE_QUEUE_MAX_HOURS = 2;

/**
 * Maximum offline queue support duration in milliseconds (2 hours).
 */
export const OFFLINE_QUEUE_MAX_MS = OFFLINE_QUEUE_MAX_HOURS * 60 * 60 * 1000;

/**
 * Hard limit for local message storage budget in bytes (15 MB).
 */
export const STORAGE_LIMIT_BYTES = 15 * 1024 * 1024;

/**
 * Threshold at which LRU pruning is triggered in bytes (10 MB).
 */
export const STORAGE_PRUNE_THRESHOLD_BYTES = 10 * 1024 * 1024;

/**
 * Target storage size after LRU pruning completes in bytes (8 MB).
 */
export const STORAGE_TARGET_BYTES = 8 * 1024 * 1024;

/**
 * Base delay for exponential backoff in milliseconds (1 second).
 */
export const SYNC_BACKOFF_BASE_MS = 1000;

/**
 * Maximum delay cap for exponential backoff in milliseconds (30 seconds).
 */
export const SYNC_BACKOFF_MAX_MS = 30000;

/**
 * Randomized jitter factor applied to backoff delays.
 */
export const SYNC_JITTER_FACTOR = 0.5;

/**
 * Interval for periodic network status checks in milliseconds (5 seconds).
 */
export const NETWORK_STATUS_CHECK_INTERVAL = 5000;

/**
 * Interval for polling status from the Cloud Relay in milliseconds (10 seconds).
 */
export const STATUS_POLL_INTERVAL = 10000;

/**
 * Timeout for Cloud Relay HTTP requests in milliseconds (10 seconds).
 */
export const CLOUD_SYNC_TIMEOUT = 10000;

/**
 * Standard prefix for MobileTrust Relay tracking IDs.
 */
export const TRACKING_ID_PREFIX = 'MTR-';

/**
 * Standard single SMS character limit.
 */
export const SMS_MAX_LENGTH = 160;

/**
 * Time window for message deduplication hashing in milliseconds (5 minutes).
 */
export const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;

/**
 * Default local storage keys used across mobile services.
 */
export const STORAGE_KEYS = {
  MESSAGES: 'mtr_messages_v1',
  AUDIT_LOGS: 'mtr_audit_logs_v1',
  SETTINGS: 'mtr_settings_v1',
} as const;

export const RELAY_CONFIG = {
  MAX_RETRIES,
  DEDUPLICATION_WINDOW_MS: DUPLICATE_WINDOW_MS,
  STATUS_DISPLAY_LATENCY_MAX_SEC: 15,
  RELAY_PROCESSING_LATENCY_MAX_SEC: 30,
  MAX_STORAGE_BUDGET_BYTES: STORAGE_LIMIT_BYTES,
  OFFLINE_RETENTION_HOURS: OFFLINE_QUEUE_MAX_HOURS,
  DEFAULT_CARRIER: 'BSNL-DisasterRelief',
};
