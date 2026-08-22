import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../AppNavigator';
import { useMessages } from '../context/MessageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type DetailRouteProp = RouteProp<RootStackParamList, 'MessageDetail'>;

export const MessageDetailModal = () => {
  const route = useRoute<DetailRouteProp>();
  const navigation = useNavigation();
  const { messages } = useMessages();
  const insets = useSafeAreaInsets();
  
  const message = messages.find(m => m.id === route.params.messageId);

  if (!message) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Message not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>Close</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Details.</Text>

        <View style={styles.metaCard}>
          <Text style={styles.label}>ID</Text>
          <Text style={styles.value}>{message.id}</Text>
          
          <View style={styles.spacer} />
          
          <Text style={styles.label}>To</Text>
          <Text style={styles.value}>{message.recipient}</Text>
          
          <View style={styles.spacer} />
          
          <Text style={styles.label}>Message</Text>
          <Text style={styles.valueContent}>{message.content}</Text>
        </View>

        <Text style={styles.sectionTitle}>Timeline</Text>
        
        <View style={styles.timeline}>
          {/* Step 1: Created */}
          <View style={styles.timelineStep}>
            <View style={[styles.node, styles.nodeActive]} />
            <View style={[styles.line, message.timestampSent ? styles.lineActive : null]} />
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Queued</Text>
              <Text style={styles.stepTime}>{new Date(message.timestampCreated).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</Text>
            </View>
          </View>

          {/* Step 2: Dispatched */}
          <View style={styles.timelineStep}>
            <View style={[styles.node, message.timestampSent ? styles.nodeActive : null]} />
            <View style={[styles.line, message.timestampDelivered ? styles.lineActive : null]} />
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, !message.timestampSent && styles.stepPending]}>Radio Transmission</Text>
              {message.timestampSent ? (
                <Text style={styles.stepTime}>{new Date(message.timestampSent).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</Text>
              ) : (
                <Text style={styles.stepPendingTime}>Pending...</Text>
              )}
            </View>
          </View>

          {/* Step 3: Delivered (Cloud/Carrier DLR) */}
          <View style={styles.timelineStep}>
            <View style={[styles.node, message.status === 'DELIVERED' ? styles.nodeSuccess : message.status === 'FAILED_CARRIER' ? styles.nodeError : null]} />
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, !message.timestampDelivered && message.status !== 'FAILED_CARRIER' && styles.stepPending]}>
                {message.status === 'FAILED_CARRIER' ? 'Failed' : 'Delivered'}
              </Text>
              {message.timestampDelivered && (
                <Text style={styles.stepTime}>{new Date(message.timestampDelivered).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</Text>
              )}
              {message.status === 'FAILED_CARRIER' && (
                <Text style={styles.stepError}>Failed after {message.retryCount} retries</Text>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    paddingHorizontal: 24, 
    paddingBottom: 16,
    backgroundColor: '#000000',
  },
  title: { fontSize: 34, color: '#FFFFFF', fontWeight: '300', letterSpacing: -1, marginBottom: 40 },
  closeBtn: { paddingVertical: 8 },
  closeBtnText: { color: '#FFFFFF', fontWeight: '500', fontSize: 16 },
  error: { color: '#EF4444', textAlign: 'center', marginTop: 100, fontSize: 16 },
  
  scroll: { paddingHorizontal: 24, paddingBottom: 100 },
  metaCard: { 
    marginBottom: 48, 
  },
  spacer: { height: 24 },
  label: { color: '#71717A', fontSize: 13, fontWeight: '500', marginBottom: 4 },
  value: { color: '#FFFFFF', fontSize: 16, fontWeight: '400' },
  valueContent: { color: '#D4D4D8', fontSize: 16, lineHeight: 24, fontWeight: '400' },
  
  sectionTitle: { color: '#71717A', fontSize: 13, fontWeight: '500', marginBottom: 24, textTransform: 'uppercase', letterSpacing: 1 },
  
  timeline: { paddingLeft: 8 },
  timelineStep: { flexDirection: 'row', marginBottom: 40, position: 'relative' },
  node: { 
    width: 12, 
    height: 12, 
    borderRadius: 6, 
    backgroundColor: '#27272A', 
    zIndex: 2,
    marginTop: 4
  },
  nodeActive: { backgroundColor: '#FFFFFF' },
  nodeSuccess: { backgroundColor: '#10B981' },
  nodeError: { backgroundColor: '#EF4444' },
  line: { position: 'absolute', top: 16, left: 5, width: 2, height: 60, backgroundColor: '#27272A', zIndex: 1 },
  lineActive: { backgroundColor: '#FFFFFF' },
  stepContent: { marginLeft: 24, marginTop: 0 },
  stepTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
  stepPending: { color: '#71717A' },
  stepTime: { color: '#A1A1AA', fontSize: 13, marginTop: 4 },
  stepPendingTime: { color: '#71717A', fontSize: 13, marginTop: 4 },
  stepError: { color: '#EF4444', fontSize: 13, marginTop: 4 },
});
