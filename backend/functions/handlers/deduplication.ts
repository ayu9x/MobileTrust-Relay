import * as crypto from 'crypto';
import { RELAY_CONFIG } from '../../../packages/shared/src/constants';

interface MessageFingerprint {
  recipient: string;
  normalizedText: string;
  timeBucket: number; // 5-minute bucket epoch
}

interface ClusterRecord {
  primaryTrackingId: string;
  clusterTrackingIds: string[];
  recipient: string;
  firstSeen: number;
}

/**
 * Duplicate Message Detector and Cluster Merger
 * Detects identical or highly similar emergency alerts sent by multiple field responders
 * to the same recipient within a 5-minute time window.
 */
export class DeduplicationEngine {
  private static instance: DeduplicationEngine;
  private fingerprintToCluster: Map<string, ClusterRecord> = new Map();

  private constructor() {}

  public static getInstance(): DeduplicationEngine {
    if (!DeduplicationEngine.instance) {
      DeduplicationEngine.instance = new DeduplicationEngine();
    }
    return DeduplicationEngine.instance;
  }

  /**
   * Generates a deterministic hash for deduplication
   */
  public generateFingerprint(recipient: string, payload: string, timestampMs: number = Date.now()): string {
    const timeBucket = Math.floor(timestampMs / RELAY_CONFIG.DEDUPLICATION_WINDOW_MS);
    
    // Normalize text: remove whitespace, casing, and tracking footers if any
    const normalized = payload
      .replace(/\[TRK:.*?\]/gi, '')
      .replace(/\s+/g, '')
      .toLowerCase()
      .trim();

    const normalizedRecipient = recipient.replace(/[^\d+]/g, '');

    const raw = `${normalizedRecipient}:${normalized}:${timeBucket}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Evaluates an incoming message. If duplicate is detected, merges with existing cluster.
   */
  public checkAndMerge(trackingId: string, recipient: string, payload: string): {
    isDuplicate: boolean;
    primaryTrackingId: string;
    clusterSize: number;
    allClusterIds: string[];
  } {
    const fingerprint = this.generateFingerprint(recipient, payload);
    const now = Date.now();

    const existing = this.fingerprintToCluster.get(fingerprint);

    if (existing) {
      // Avoid duplicate self-insertion
      if (!existing.clusterTrackingIds.includes(trackingId)) {
        existing.clusterTrackingIds.push(trackingId);
      }
      return {
        isDuplicate: true,
        primaryTrackingId: existing.primaryTrackingId,
        clusterSize: existing.clusterTrackingIds.length,
        allClusterIds: [...existing.clusterTrackingIds],
      };
    }

    // New distinct message cluster
    const newCluster: ClusterRecord = {
      primaryTrackingId: trackingId,
      clusterTrackingIds: [trackingId],
      recipient,
      firstSeen: now,
    };
    this.fingerprintToCluster.set(fingerprint, newCluster);

    return {
      isDuplicate: false,
      primaryTrackingId: trackingId,
      clusterSize: 1,
      allClusterIds: [trackingId],
    };
  }

  /**
   * Retrieves all tracking IDs clustered with the given ID
   */
  public getClusterFor(trackingId: string): string[] {
    for (const cluster of this.fingerprintToCluster.values()) {
      if (cluster.clusterTrackingIds.includes(trackingId)) {
        return cluster.clusterTrackingIds;
      }
    }
    return [trackingId];
  }
}
