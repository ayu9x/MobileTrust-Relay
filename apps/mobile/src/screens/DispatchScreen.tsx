import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MessagePriority, EmergencyMessage } from '@mobiletrust/shared';
import { PrioritySelector } from '../components/PrioritySelector';
import { generateTrackingId } from '../crypto/hash';
import { useMessages } from '../context/MessageContext';

// PRD Single GSM-7 SMS budget: 160 total - 25 for [TRK:MTR-XXXXXX-XXXX] footer = 135 chars
const MAX_CHARS = 135;

export const DispatchScreen = () => {
  const navigation = useNavigation();
  const { addMessage, isOffline } = useMessages();
  
  const [recipient, setRecipient] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<MessagePriority>('STANDARD');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    // Validation
    const phoneRegex = /^\+91[0-9]{10}$/;
    if (!phoneRegex.test(recipient.trim())) {
      Alert.alert('Invalid Format', 'Please enter a valid Indian mobile number starting with +91 (e.g. +919876543210)');
      return;
    }
    if (!content.trim()) {
      Alert.alert('Empty Message', 'Message content cannot be empty.');
      return;
    }

    setIsSending(true);

    const trackingId = generateTrackingId();
    const nowIso = new Date().toISOString();

    const message: EmergencyMessage = {
      id: trackingId,
      recipient: recipient.trim(),
      payload: content.trim(),
      status: isOffline ? 'QUEUED_OFFLINE' : 'SENT',
      priority,
      isEncrypted: false,
      retryCount: 0,
      maxRetries: 3,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      const proceed = await addMessage(message);
      if (proceed) {
        navigation.goBack();
      }
    } catch (e) {
      Alert.alert('Dispatch Error', 'Failed to dispatch emergency alert.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.formCard}>
        <Text style={styles.title}>New Emergency Dispatch</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Recipient (IND)</Text>
          <TextInput
            style={styles.input}
            placeholder="+91XXXXXXXXXX"
            keyboardType="phone-pad"
            value={recipient}
            onChangeText={setRecipient}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Message Payload</Text>
            <Text style={[styles.counter, content.length > MAX_CHARS - 10 && styles.counterWarning]}>
              {content.length}/{MAX_CHARS}
            </Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Situation details, location..."
            multiline
            maxLength={MAX_CHARS}
            numberOfLines={4}
            value={content}
            onChangeText={setContent}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <PrioritySelector priority={priority} onChange={setPriority} />

        <TouchableOpacity 
          style={[styles.sendButton, isSending && styles.sendButtonDisabled]} 
          onPress={handleSend}
          disabled={isSending}
        >
          <Text style={styles.sendButtonText}>
            {isSending ? 'DISPATCHING...' : 'SEND ALERT VIA CARRIER'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827', // Premium Dark background
    padding: 16,
    justifyContent: 'center',
  },
  formCard: {
    backgroundColor: '#1F2937',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F9FAFB',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  counter: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  counterWarning: {
    color: '#F59E0B',
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  sendButtonDisabled: {
    backgroundColor: '#4B5563',
    shadowOpacity: 0,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
