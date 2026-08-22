import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../AppNavigator';
import { useMessages } from '../context/MessageContext';

type DetailRouteProp = RouteProp<RootStackParamList, 'MessageDetail'>;

export const MessageDetailModal = () => {
  const route = useRoute<DetailRouteProp>();
  const navigation = useNavigation();
  const { messages } = useMessages();
  
  const message = messages.find(m => m.id === route.params.messageId);

  if (!message) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Message not found.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Delivery Lifecycle</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.metaCard}>
          <Text style={styles.label}>Tracking ID</Text>
          <Text style={styles.value}>{message.id}</Text>
          
          <Text style={styles.label}>Recipient</Text>
          <Text style={styles.value}>{message.recipient}</Text>
          
          <Text style={styles.label}>Payload</Text>
          <Text style={styles.value}>{message.content}</Text>
        </View>

        <Text style={styles.sectionTitle}>Timeline</Text>
        
        <View style={styles.timeline}>
          {/* Step 1: Created */}
          <View style={styles.timelineStep}>
            <View style={[styles.node, styles.nodeActive]} />
            <View style={[styles.line, message.timestampSent ? styles.lineActive : null]} />
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Message Created</Text>
              <Text style={styles.stepTime}>{new Date(message.timestampCreated || message.createdAt || Date.now()).toLocaleString()}</Text>
            </View>
          </View>

          {/* Step 2: Dispatched */}
          <View style={styles.timelineStep}>
            <View style={[styles.node, message.timestampSent ? styles.nodeActive : null]} />
            <View style={[styles.line, message.timestampDelivered ? styles.lineActive : null]} />
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, !message.timestampSent && styles.stepPending]}>Dispatched to Carrier (Radio)</Text>
              {message.timestampSent && (
                <Text style={styles.stepTime}>{new Date(message.timestampSent).toLocaleString()}</Text>
              )}
            </View>
          </View>

          {/* Step 3: Delivered (Cloud/Carrier DLR) */}
          <View style={styles.timelineStep}>
            <View style={[styles.node, message.status === 'DELIVERED' ? styles.nodeSuccess : message.status === 'FAILED_CARRIER' ? styles.nodeError : null]} />
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, !message.timestampDelivered && message.status !== 'FAILED_CARRIER' && styles.stepPending]}>
                {message.status === 'FAILED_CARRIER' ? 'Delivery Failed' : 'Confirmed Delivered'}
              </Text>
              {message.timestampDelivered && (
                <Text style={styles.stepTime}>{new Date(message.timestampDelivered).toLocaleString()}</Text>
              )}
              {message.status === 'FAILED_CARRIER' && (
                <Text style={styles.stepError}>Failed after {message.retryCount} retries</Text>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  title: { fontSize: 18, color: '#F8FAFC', fontWeight: '800' },
  closeBtn: { padding: 8 },
  closeBtnText: { color: '#3B82F6', fontWeight: '700', fontSize: 16 },
  error: { color: '#EF4444', textAlign: 'center', marginTop: 50 },
  
  scroll: { padding: 20 },
  metaCard: { backgroundColor: '#1E293B', padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#334155' },
  label: { color: '#64748B', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4, marginTop: 12 },
  value: { color: '#F8FAFC', fontSize: 15 },
  
  sectionTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '800', marginBottom: 16 },
  
  timeline: { paddingLeft: 10 },
  timelineStep: { flexDirection: 'row', marginBottom: 30, position: 'relative' },
  node: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#334155', borderWidth: 3, borderColor: '#0F172A', zIndex: 2 },
  nodeActive: { backgroundColor: '#3B82F6' },
  nodeSuccess: { backgroundColor: '#10B981' },
  nodeError: { backgroundColor: '#EF4444' },
  line: { position: 'absolute', top: 14, left: 6, width: 2, height: 50, backgroundColor: '#334155', zIndex: 1 },
  lineActive: { backgroundColor: '#3B82F6' },
  stepContent: { marginLeft: 20, marginTop: -4 },
  stepTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: '700' },
  stepPending: { color: '#64748B' },
  stepTime: { color: '#94A3B8', fontSize: 13, marginTop: 4 },
  stepError: { color: '#EF4444', fontSize: 13, marginTop: 4 },
});
