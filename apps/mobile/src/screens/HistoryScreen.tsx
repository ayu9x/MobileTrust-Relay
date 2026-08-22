import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView 
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
  const { messages } = useMessages();
  const [filter, setFilter] = useState<FilterType>('ALL');

  // Dummy logic for MVP network status
  const isOffline = false;

  // Storage estimation: naive JS string length for size mapping
  const storageBytes = useMemo(() => {
    const payload = JSON.stringify(messages);
    return new Blob([payload]).size; // Rough byte calculation
  }, [messages]);
  
  const storageMB = (storageBytes / (1024 * 1024)).toFixed(3);

  const filteredMessages = useMemo(() => {
    if (filter === 'DELIVERED') return messages.filter(m => m.status === 'DELIVERED');
    if (filter === 'FAILED') return messages.filter(m => m.status === 'FAILED_CARRIER');
    return messages;
  }, [messages, filter]);

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
        <Text style={styles.content} numberOfLines={2}>{item.content}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.timestamp}>{new Date(item.timestampCreated).toLocaleTimeString()}</Text>
          {item.priority === 'HIGH_URGENT' && <Text style={styles.urgentTag}>🔴 URGENT</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <NetworkIndicator isOffline={isOffline} />
      
      {/* Storage Tracker */}
      <View style={styles.storageHeader}>
        <View style={styles.storageBarBg}>
          <View style={[styles.storageBarFill, { width: `${Math.min((storageBytes / 15000000) * 100, 100)}%` }]} />
        </View>
        <Text style={styles.storageText}>
          Local Cache: {storageMB} MB / 15 MB Budget
        </Text>
      </View>

      {/* 3-Retry Failure Global Banner Check */}
      {messages.some(m => m.status === 'FAILED_CARRIER' && m.retryCount >= 3) && (
        <View style={{ paddingHorizontal: 16 }}>
          <RetryFailureBanner 
            isVisible={true} 
            onResend={() => console.log('Resending alternative...')} 
            onMarkCritical={() => console.log('Marking critical...')} 
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
        ListEmptyComponent={<Text style={styles.emptyText}>No tracking history found.</Text>}
      />

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('Dispatch')}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  storageHeader: { padding: 16, backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: '#334155' },
  storageBarBg: { height: 6, backgroundColor: '#334155', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  storageBarFill: { height: '100%', backgroundColor: '#10B981' },
  storageText: { color: '#94A3B8', fontSize: 11, fontWeight: '700', textAlign: 'right', textTransform: 'uppercase' },
  
  filterRow: { flexDirection: 'row', padding: 16, gap: 8 },
  filterPill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  filterPillActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  filterText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: '#FFFFFF' },

  listContainer: { padding: 16, paddingBottom: 100 },
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
  
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    backgroundColor: '#3B82F6',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  fabIcon: { fontSize: 28, color: '#FFFFFF', fontWeight: '400', marginTop: -2 },
});
