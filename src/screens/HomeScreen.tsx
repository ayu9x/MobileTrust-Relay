import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../AppNavigator';
import { useMessages, Message } from '../context/MessageContext';
// import NetInfo from '@react-native-community/netinfo'; // We can add this later for real offline status

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { messages } = useMessages();
  const [isOffline, setIsOffline] = useState(false);

  // Mock offline detection for now
  useEffect(() => {
    // setIsOffline(!navigator.onLine);
  }, []);

  const renderItem = ({ item }: { item: Message }) => {
    const statusColor = 
      item.status === 'Delivered' ? '#4CAF50' : 
      item.status === 'Failed' ? '#F44336' : 
      item.status === 'Sent' ? '#2196F3' : '#FFC107';

    return (
      <View style={styles.messageCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.recipient}>To: {item.recipient}</Text>
          <Text style={[styles.status, { color: statusColor }]}>{item.status}</Text>
        </View>
        <Text style={styles.content} numberOfLines={2}>{item.content}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.timestamp}>{new Date(item.timestamp).toLocaleString()}</Text>
          {item.urgency === 'High' && <Text style={styles.urgencyBadge}>High Urgency</Text>}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>No Internet - Offline Mode</Text>
        </View>
      )}
      
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.emptyText}>No emergency messages sent yet.</Text>}
      />

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('SendMessage')}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  offlineBanner: { backgroundColor: '#F44336', padding: 8, alignItems: 'center' },
  offlineText: { color: 'white', fontWeight: 'bold' },
  listContainer: { padding: 16, paddingBottom: 80 },
  messageCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  recipient: { fontWeight: 'bold', fontSize: 16 },
  status: { fontWeight: 'bold' },
  content: { color: '#424242', marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timestamp: { fontSize: 12, color: '#9e9e9e' },
  urgencyBadge: { backgroundColor: '#FFCDD2', color: '#D32F2F', fontSize: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#9e9e9e' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#2196F3',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabIcon: { fontSize: 24, color: 'white' },
});

export default HomeScreen;
