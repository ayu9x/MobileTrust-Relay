import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../AppNavigator';
import { useMessages } from '../context/MessageContext';
import { EmergencyMessage } from '@mobiletrust/shared';
import { DeliveryStatusBadge } from '../components/DeliveryStatusBadge';
import { NetworkIndicator } from '../components/NetworkIndicator';
import { RetryFailureBanner } from '../components/RetryFailureBanner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type HistoryScreenProp = NativeStackNavigationProp<RootStackParamList, 'History'>;
type FilterType = 'ALL' | 'DELIVERED' | 'FAILED';

export const HistoryScreen = () => {
  const navigation = useNavigation<HistoryScreenProp>();
  const { messages } = useMessages();
  const [filter, setFilter] = useState<FilterType>('ALL');
  const insets = useSafeAreaInsets();

  const isOffline = false;

  const storageBytes = useMemo(() => {
    const payload = JSON.stringify(messages);
    return new Blob([payload]).size;
  }, [messages]);
  
  const storageMB = (storageBytes / (1024 * 1024)).toFixed(3);
  const storagePercentage = Math.min((storageBytes / 15000000) * 100, 100);

  const filteredMessages = useMemo(() => {
    if (filter === 'DELIVERED') return messages.filter(m => m.status === 'DELIVERED');
    if (filter === 'FAILED') return messages.filter(m => m.status === 'FAILED_CARRIER');
    return messages;
  }, [messages, filter]);

  const renderItem = ({ item }: { item: EmergencyMessage }) => {
    return (
      <TouchableOpacity 
        activeOpacity={0.7}
        style={styles.messageCard}
        onPress={() => navigation.navigate('MessageDetail', { messageId: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.recipient}>{item.recipient}</Text>
          <Text style={styles.timestamp}>
            {new Date(item.timestampCreated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
          </Text>
        </View>
        
        <Text style={styles.content} numberOfLines={2}>{item.content}</Text>
        
        <View style={styles.cardFooter}>
          <DeliveryStatusBadge status={item.status} retryCount={item.retryCount} />
          {item.priority === 'HIGH_URGENT' && (
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentText}>URGENT</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* MINIMALIST HEADER */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 20) }]}>
        <NetworkIndicator isOffline={isOffline} />
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Relay.</Text>
        </View>
        
        {/* ULTRA-THIN STORAGE BAR */}
        <View style={styles.storageContainer}>
          <View style={styles.storageTextRow}>
            <Text style={styles.storageLabel}>Local Storage</Text>
            <Text style={styles.storageValue}>{storageMB} MB / 15.0 MB</Text>
          </View>
          <View style={styles.storageBarBg}>
            <View style={[styles.storageBarFill, { width: `${storagePercentage}%` }]} />
          </View>
        </View>
      </View>

      {messages.some(m => m.status === 'FAILED_CARRIER' && m.retryCount >= 3) && (
        <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
          <RetryFailureBanner 
            isVisible={true} 
            onResend={() => console.log('Resending alternative...')} 
            onMarkCritical={() => console.log('Marking critical...')} 
          />
        </View>
      )}

      {/* MINIMALIST FILTERS */}
      <View style={styles.filterRow}>
        {(['ALL', 'DELIVERED', 'FAILED'] as FilterType[]).map(f => (
          <TouchableOpacity 
            key={f} 
            activeOpacity={0.6}
            style={styles.filterBtn}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0) + f.slice(1).toLowerCase()}
            </Text>
            {filter === f && <View style={styles.filterIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredMessages}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.emptyText}>No messages.</Text>}
      />

      <TouchableOpacity 
        activeOpacity={0.9}
        style={styles.fab} 
        onPress={() => navigation.navigate('Dispatch')}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  
  headerContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  headerTitleRow: {
    marginTop: 20,
    marginBottom: 32,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '300',
    letterSpacing: -1,
  },
  
  storageContainer: {
    marginBottom: 8,
  },
  storageTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  storageLabel: { color: '#71717A', fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1 },
  storageValue: { color: '#A1A1AA', fontSize: 11, fontWeight: '400' },
  storageBarBg: { height: 2, backgroundColor: '#27272A', borderRadius: 1, overflow: 'hidden' },
  storageBarFill: { height: '100%', backgroundColor: '#FFFFFF' },
  
  filterRow: { flexDirection: 'row', paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#18181B' },
  filterBtn: { marginRight: 24, position: 'relative', paddingBottom: 8 },
  filterText: { color: '#71717A', fontSize: 14, fontWeight: '500', letterSpacing: 0.5 },
  filterTextActive: { color: '#FFFFFF', fontWeight: '600' },
  filterIndicator: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, backgroundColor: '#FFFFFF' },

  listContainer: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 120 },
  
  messageCard: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#18181B',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  recipient: { color: '#FFFFFF', fontSize: 16, fontWeight: '500', letterSpacing: 0.5 },
  timestamp: { color: '#71717A', fontSize: 12, fontWeight: '400' },
  
  content: { color: '#A1A1AA', fontSize: 15, lineHeight: 22, fontWeight: '400', marginBottom: 16 },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  
  urgentBadge: { backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  urgentText: { color: '#EF4444', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  
  emptyText: { textAlign: 'center', marginTop: 60, color: '#52525B', fontSize: 15, fontWeight: '400' },
  
  fab: {
    position: 'absolute',
    bottom: 40,
    right: 30,
    backgroundColor: '#FFFFFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  fabIcon: { fontSize: 32, color: '#000000', fontWeight: '300', marginTop: -2 },
});
