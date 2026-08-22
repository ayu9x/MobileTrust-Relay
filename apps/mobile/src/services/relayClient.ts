import {
  BatchStatusRequest,
  BatchStatusResponse,
  BatchStatusResponseSchema,
  CarrierReceiptPayload,
  CarrierReceiptPayloadSchema,
  CLOUD_SYNC_TIMEOUT,
  RelayStatusResponse,
  RelayStatusResponseSchema,
} from '@mobiletrust/shared';

export class RelayClientError extends Error {
  public statusCode?: number;
  public retryable: boolean;

  constructor(message: string, statusCode?: number, retryable: boolean = true) {
    super(message);
    this.name = 'RelayClientError';
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}

export type MockStatusHandler = (trackingIds: string[]) => Promise<Record<string, CarrierReceiptPayload>>;

export class RelayClient {
  private baseUrl: string;
  private timeoutMs: number;
  private mockHandler: MockStatusHandler | null = null;
  private mockCarrierDb: Map<string, CarrierReceiptPayload> = new Map();

  constructor(baseUrl: string = 'http://localhost:8080', timeoutMs: number = CLOUD_SYNC_TIMEOUT) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.timeoutMs = timeoutMs;
  }

  /**
   * Sets a custom mock handler for testing without network.
   */
  setMockHandler(handler: MockStatusHandler | null): void {
    this.mockHandler = handler;
  }

  /**
   * Sets a mock carrier receipt for a specific tracking ID (useful in unit tests).
   */
  setMockReceipt(trackingId: string, receipt: CarrierReceiptPayload): void {
    this.mockCarrierDb.set(trackingId, receipt);
  }

  /**
   * Clears mock receipts.
   */
  clearMockReceipts(): void {
    this.mockCarrierDb.clear();
    this.mockHandler = null;
  }

  /**
   * Fetches status for a single tracking ID.
   */
  async getStatus(trackingId: string): Promise<RelayStatusResponse> {
    const batch = await this.getBatchStatus([trackingId]);
    const receipt = batch.statuses[trackingId];

    if (!receipt) {
      return {
        trackingId,
        status: 'QUEUED_OFFLINE',
        lastUpdated: new Date().toISOString(),
      };
    }

    const deliveryStatus =
      receipt.carrierStatus === 'DELIVRD'
        ? 'DELIVERED'
        : receipt.carrierStatus === 'UNDELIV' || receipt.carrierStatus === 'EXPIRED'
        ? 'FAILED'
        : 'SENT';

    const response: RelayStatusResponse = {
      trackingId,
      status: deliveryStatus,
      carrierReceipt: receipt,
      lastUpdated: receipt.carrierTimestamp,
    };

    const parsed = RelayStatusResponseSchema.safeParse(response);
    if (!parsed.success) {
      throw new RelayClientError(`Malformed relay status response: ${parsed.error.message}`, 422, false);
    }

    return parsed.data as RelayStatusResponse;
  }

  /**
   * Fetches batch carrier receipt statuses for multiple tracking IDs.
   */
  async getBatchStatus(trackingIds: string[]): Promise<BatchStatusResponse> {
    if (!trackingIds || trackingIds.length === 0) {
      return { statuses: {}, notFound: [] };
    }

    // If mock handler or mock DB is configured, use it directly (deterministic tests)
    if (this.mockHandler) {
      const statuses = await this.mockHandler(trackingIds);
      return { statuses };
    }

    if (this.mockCarrierDb.size > 0) {
      const statuses: Record<string, CarrierReceiptPayload> = {};
      const notFound: string[] = [];

      for (const id of trackingIds) {
        if (this.mockCarrierDb.has(id)) {
          statuses[id] = this.mockCarrierDb.get(id)!;
        } else {
          notFound.push(id);
        }
      }

      return { statuses, notFound };
    }

    // Real HTTP Network Request
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const requestPayload: BatchStatusRequest = { trackingIds };
      const response = await fetch(`${this.baseUrl}/api/v1/relay/batch-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const isRetryable = response.status >= 500 || response.status === 429;
        throw new RelayClientError(
          `Cloud Relay HTTP error: ${response.status} ${response.statusText}`,
          response.status,
          isRetryable
        );
      }

      const json = await response.json();
      const validation = BatchStatusResponseSchema.safeParse(json);
      if (!validation.success) {
        throw new RelayClientError(
          `Invalid cloud relay response format: ${validation.error.message}`,
          422,
          false
        );
      }

      return validation.data as BatchStatusResponse;
    } catch (err: unknown) {
      if (err instanceof RelayClientError) {
        throw err;
      }
      if (err instanceof Error && err.name === 'AbortError') {
        throw new RelayClientError(`Cloud Relay request timed out after ${this.timeoutMs}ms`, 408, true);
      }
      throw new RelayClientError(
        `Cloud Relay network connection failure: ${err instanceof Error ? err.message : String(err)}`,
        503,
        true
      );
    } finally {
      clearTimeout(timer);
    }
  }
}

// Global default instance
export const relayClient = new RelayClient();
