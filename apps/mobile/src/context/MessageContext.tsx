import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { 
  EmergencyMessage, 
  DeliveryStatus, 
  StorageStats, 
  STATUS_POLL_INTERVAL,
  DUPLICATE_WINDOW_MS,
} from '@mobiletrust/shared';
import { messageStore } from '../store/messageStore';
import { syncEngine } from '../services/syncEngine';
import { relayClient } from '../services/relayClient';
import { networkMonitor } from '../services/networkMonitor';
import { generateFingerprint } from '../crypto/hash';
import { SmsDispatcher } from '../native/SmsDispatcher';

interface MessageContextType {
  messages: EmergencyMessage[];
  isOffline: boolean;
  storageStats: StorageStats;
  addMessage: (msg: EmergencyMessage) => Promise<boolean>;
  updateMessageStatus: (id: string, status: DeliveryStatus) => Promise<void>;
  syncNow: () => Promise<void>;
  resendMessage: (id: string) => Promise<void>;
  markCriticalDropout: (id: string) => Promise<void>;
  clearAllMessages: () => Promise<void>;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<EmergencyMessage[]>([]);
  const [isOffline, setIsOffline] = useState<boolean>(!networkMonitor.isOnline());

  const refreshFromStore = useCallback(() => {
    const list = messageStore.getMessages();
    // Sort chronological descending (newest first)
    list.sort((a, b) => {
      const tA = a.timestampCreated || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const tB = b.timestampCreated || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return tB - tA;
    });
    setMessages([...list]);
  }, []);

  useEffect(() => {
    // 1. Load persisted store on startup
    messageStore.loadPersisted().then(() => {
      refreshFromStore();
    });

    // 2. Start SyncEngine and NetworkMonitor lifecycle
    networkMonitor.start(2000);
    syncEngine.start();

    // 3. Subscribe to Store Updates
    const unsubStore = messageStore.subscribe(() => {
      refreshFromStore();
    });

    // 4. Subscribe to Network Transitions
    const unsubNetwork = networkMonitor.subscribe((online) => {
      setIsOffline(!online);
      if (online) {
        syncEngine.syncQueue().catch(console.error);
      }
    });

    // 5. Background Poller for Sub-3s Live Status Sync when pending messages exist
    const poller = setInterval(() => {
      if (networkMonitor.isOnline() && messageStore.getPendingMessages().length > 0) {
        syncEngine.syncQueue().catch(console.error);
      }
    }, 2000);

    return () => {
      unsubStore();
      unsubNetwork();
      clearInterval(poller);
      syncEngine.stop();
      networkMonitor.stop();
    };
  }, [refreshFromStore]);

  const storageStats = useMemo(() => {
    return messageStore.getStorageStats();
  }, [messages]);

  const checkForDuplicate = (recipient: string, payload: string): boolean => {
    const now = Date.now();
    const currentFingerprint = generateFingerprint(recipient, payload, now);
    
    return messages.some((m) => {
      const msgTime = m.timestampCreated || (m.createdAt ? new Date(m.createdAt).getTime() : 0);
      if (now - msgTime > DUPLICATE_WINDOW_MS) return false;
      const existingFingerprint = generateFingerprint(m.recipient, m.content || m.payload || '', msgTime);
      return existingFingerprint === currentFingerprint;
    });
  };

  const processAddMessage = async (msg: EmergencyMessage): Promise<void> => {
    // 1. Dispatch through Native SMS Cellular Bridge
    await SmsDispatcher.dispatch(msg);

    // 2. Persist in Unified MessageStore
    await messageStore.addMessage(msg);

    // 3. Ingest tracking ID to Cloud Relay
    relayClient.ingestMessage({
      id: msg.id,
      recipient: msg.recipient,
      payload: msg.content || msg.payload || '',
      priority: msg.priority,
      status: msg.status,
      createdAt: msg.createdAt,
    }).catch(() => {});

    // 4. If online, trigger cloud synchronization immediately and schedule carrier receipt reconciliation
    if (networkMonitor.isOnline()) {
      syncEngine.syncQueue().catch(() => {});
      // Reconcile carrier DLR delivery receipt after 2 seconds
      setTimeout(() => {
        if (networkMonitor.isOnline()) {
          syncEngine.syncQueue().catch(() => {});
        }
      }, 2000);
    }
  };

  const addMessage = async (msg: EmergencyMessage): Promise<boolean> => {
    const payloadText = msg.content || msg.payload || '';
    const isDuplicate = checkForDuplicate(msg.recipient, payloadText);

    if (isDuplicate) {
      return new Promise<boolean>((resolve) => {
        Alert.alert(
          'Duplicate Message Detected',
          'A similar emergency alert was sent to this recipient within the last 5 minutes. Are you sure you want to broadcast it again?',
          [
            { 
              text: 'Cancel', 
              style: 'cancel', 
              onPress: () => resolve(false) 
            },
            { 
              text: 'Send Anyway', 
              style: 'destructive',
              onPress: async () => {
                await processAddMessage(msg);
                resolve(true);
              }
            }
          ]
        );
      });
    } else {
      await processAddMessage(msg);
      return true;
    }
  };

  const updateMessageStatus = async (id: string, status: DeliveryStatus): Promise<void> => {
    const existing = messageStore.getMessage(id);
    if (!existing) return;

    const patch: Partial<EmergencyMessage> = { status };
    if (status === 'FAILED' || status === 'FAILED_CARRIER') {
      patch.retryCount = (existing.retryCount || 0) + 1;
    } else if (status === 'DELIVERED') {
      patch.deliveredAt = new Date().toISOString();
    }
    await messageStore.updateMessage(id, patch);
  };

  const syncNow = async (): Promise<void> => {
    await syncEngine.syncQueue();
  };

  const resendMessage = async (id: string): Promise<void> => {
    const existing = messageStore.getMessage(id);
    if (!existing) return;

    await messageStore.updateMessage(id, {
      status: networkMonitor.isOnline() ? 'SENT' : 'QUEUED_OFFLINE',
      retryCount: 0,
      failureReason: undefined,
      isAcknowledged: false,
      isCriticalDropout: false,
    });

    await SmsDispatcher.dispatch(existing);

    relayClient.ingestMessage({
      id: existing.id,
      recipient: existing.recipient,
      payload: existing.content || existing.payload || '',
      priority: existing.priority,
      status: networkMonitor.isOnline() ? 'SENT' : 'QUEUED_OFFLINE',
      createdAt: existing.createdAt,
    }).catch(() => {});

    if (networkMonitor.isOnline()) {
      await syncEngine.syncQueue();
      setTimeout(() => {
        if (networkMonitor.isOnline()) {
          syncEngine.syncQueue().catch(() => {});
        }
      }, 2000);
    }
  };

  const markCriticalDropout = async (id: string): Promise<void> => {
    const existing = messageStore.getMessage(id);
    if (!existing) return;

    await messageStore.updateMessage(id, {
      status: 'FAILED',
      failureReason: 'Critical Dropout: Recipient unreachable after 3 attempts',
      retryCount: 0,
      isAcknowledged: true,
      isCriticalDropout: true,
    });
  };

  const clearAllMessages = async (): Promise<void> => {
    await messageStore.clear();
    relayClient.clearMockReceipts();
  };

  return (
    <MessageContext.Provider 
      value={{ 
        messages, 
        isOffline, 
        storageStats, 
        addMessage, 
        updateMessageStatus, 
        syncNow, 
        resendMessage,
        markCriticalDropout,
        clearAllMessages,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
};

export const useMessages = () => {
  const ctx = useContext(MessageContext);
  if (!ctx) throw new Error('useMessages must be used within MessageProvider');
  return ctx;
};
