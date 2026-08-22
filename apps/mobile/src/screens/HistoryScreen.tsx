import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../AppNavigator';
import { useMessages } from '../context/MessageContext';
import { EmergencyMessage } from '@mobiletrust/shared';
import { DeliveryStatusBadge } from '../components/DeliveryStatusBadge';
import { NetworkIndicator } from '../components/NetworkIndicator';
import { RetryFailureBanner } from '../components/RetryFailureBanner';

type HistoryScreenProp = NativeStackNavigationProp<RootStackParamList, 'History'>;
type FilterType = 'ALL' | 'DELIVERED' | 'FAILED';

export const HistoryScreen = () => {
  const navigation = useNavigation<HistoryScreenProp>();
  const { messages, isOffline, storageStats, resendMessage, markCriticalDropout, syncNow, clearAllMessages } = useMessages();
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [dismissedBannerIds, setDismissedBannerIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      await syncNow();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearMemory = () => {
    Alert.alert(
      'Reset Storage Budget',
      'Are you sure you want to clear all stored emergency alerts and reset local cache to 0 MB?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: async () => {
            await clearAllMessages();
          }
        }
      ]
    );
  };

  const storageBytes = storageStats?.totalBytes || 0;
  const storageLimitBytes = storageStats?.limitBytes || 15 * 1024 * 1024;
  const storageMB = (storageBytes / (1024 * 1024)).toFixed(3);

  const filteredMessages = useMemo(() => {
    if (filter === 'DELIVERED') {
      return messages.filter(m => m.status === 'DELIVERED' || m.status === 'RELAYED_CLOUD');
    }
    if (filter === 'FAILED') {
      return messages.filter(m => m.status === 'FAILED' || m.status === 'FAILED_CARRIER');
    }
    return messages;
  }, [messages, filter]);

  const failedRetryMessage = useMemo(() => {
    return messages.find(
      m => (m.status === 'FAILED' || m.status === 'FAILED_CARRIER') && 
           m.retryCount >= 3 &&
           !m.isAcknowledged &&
           !m.isCriticalDropout &&
           !dismissedBannerIds.has(m.id)
    );
  }, [messages, dismissedBannerIds]);

  const handleResend = async (id: string) => {
    setDismissedBannerIds(prev => new Set(prev).add(id));
    await resendMessage(id);
  };

  const handleMarkCritical = async (id: string) => {
    setDismissedBannerIds(prev => new Set(prev).add(id));
    await markCriticalDropout(id);
  };

  const renderItem = ({ item }: { item: EmergencyMessage }) => {
    return (
      <TouchableOpacity 
        style={styles.messageCard}
        onPress={() => navigation.navigate('MessageDetail', { messageId: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.recipient}>{item.recipient}</Text>
          <DeliveryStatusBadge status={item.status} retryCount={item.retryCount} />
        </View>
        <Text style={styles.content} numberOfLines={2}>{item.content || item.payload}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.timestamp}>
            {new Date(item.timestampCreated || (item.createdAt ? new Date(item.createdAt).getTime() : Date.now())).toLocaleTimeString()}
          </Text>
          {item.priority === 'HIGH_URGENT' && <Text style={styles.urgentTag}>🔴 URGENT</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <NetworkIndicator isOffline={isOffline} />
      
      {/* Storage Budget Tracker (< 15MB Guaranteed) */}
      <View style={styles.storageHeader}>
        <View style={styles.storageBarBg}>
          <View 
            style={[
              styles.storageBarFill, 
              { width: `${Math.min((storageBytes / storageLimitBytes) * 100, 100)}%` },
              storageStats?.isOverThreshold ? { backgroundColor: '#F59E0B' } : null
            ]} 
          />
        </View>
        <Text style={styles.storageText}>
          Local Cache: {storageMB} MB / 15 MB Budget {storageStats?.isOverThreshold ? '(Auto-Pruning)' : ''}
        </Text>
      </View>

      {/* 3-Retry Failure Global Banner Check */}
      {failedRetryMessage && (
        <View style={{ paddingHorizontal: 16 }}>
          <RetryFailureBanner 
            isVisible={true} 
            onResend={() => handleResend(failedRetryMessage.id)} 
            onMarkCritical={() => handleMarkCritical(failedRetryMessage.id)} 
          />
        </View>
      )}

      {/* Filters */}
      <View style={styles.filterRow}>
        {(['ALL', 'DELIVERED', 'FAILED'] as FilterType[]).map(f => (
          <TouchableOpacity 
            key={f} 
            style={[styles.filterPill, filter === f && styles.filterPillActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredMessages}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh} 
            tintColor="#3B82F6"
            colors={['#3B82F6']}
          />
        }
        ListEmptyComponent={<Text style={styles.emptyText}>No tracking history found.</Text>}
      />

      {/* Floating Action Button Stack (Clear, Sync, Add) */}
      <View style={styles.fabStack} pointerEvents="box-none">
        {/* 1. Clear Memory FAB */}
        <TouchableOpacity 
          style={[styles.miniFab, styles.clearFab]} 
          onPress={handleClearMemory}
          activeOpacity={0.8}
        >
          <Text style={styles.miniFabIcon}>🗑️</Text>
        </TouchableOpacity>

        {/* 2. Sync Relay FAB */}
        <TouchableOpacity 
          style={[styles.miniFab, styles.syncFab]} 
          onPress={onRefresh}
          disabled={isRefreshing}
          activeOpacity={0.8}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.miniFabIcon}>🔄</Text>
          )}
        </TouchableOpacity>

        {/* 3. Main New Dispatch FAB */}
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => navigation.navigate('Dispatch')}
          activeOpacity={0.8}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  storageHeader: { padding: 16, backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: '#334155' },
  storageBarBg: { height: 6, backgroundColor: '#334155', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  storageBarFill: { height: '100%', backgroundColor: '#10B981' },
  storageText: { color: '#94A3B8', fontSize: 11, fontWeight: '700', textAlign: 'right', textTransform: 'uppercase' },
  
  filterRow: { 
    flexDirection: 'row', 
    paddingHorizontal: 16, 
    paddingTop: 12, 
    paddingBottom: 8,
    gap: 8 
  },
  filterPill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  filterPillActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  filterText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: '#FFFFFF' },

  listContainer: { padding: 16, paddingBottom: 160 },
  messageCard: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  recipient: { color: '#F8FAFC', fontSize: 15, fontWeight: '700' },
  content: { color: '#94A3B8', fontSize: 14, lineHeight: 20, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timestamp: { color: '#64748B', fontSize: 12 },
  urgentTag: { color: '#EF4444', fontSize: 11, fontWeight: '800' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#64748B', fontSize: 14 },
  
  fabStack: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    alignItems: 'center',
    gap: 12,
  },
  miniFab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  clearFab: {
    backgroundColor: '#7F1D1D',
    borderWidth: 1,
    borderColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  syncFab: {
    backgroundColor: '#1E40AF',
    borderWidth: 1,
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
  },
  miniFabIcon: {
    fontSize: 18,
  },
  fab: {
    backgroundColor: '#3B82F6',
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  fabIcon: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '300',
    marginTop: -2,
  },
});
