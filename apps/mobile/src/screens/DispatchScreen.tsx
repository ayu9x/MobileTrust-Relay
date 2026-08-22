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
import { SmsDispatcher } from '../native/SmsDispatcher';
import { useMessages } from '../context/MessageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MAX_CHARS = 160;

export const DispatchScreen = () => {
  const navigation = useNavigation();
  const { addMessage } = useMessages();
  const insets = useSafeAreaInsets();
  
  const [recipient, setRecipient] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<MessagePriority>('STANDARD');
  const [isSending, setIsSending] = useState(false);

  const generateTrackingId = () => {
    const timestamp = Date.now().toString().slice(-6);
    const hash = Math.random().toString(16).slice(2, 6).toUpperCase();
    return `MTR-${timestamp}-${hash}`;
  };

  const handleSend = async () => {
    const phoneRegex = /^\+91[0-9]{10}$/;
    if (!phoneRegex.test(recipient.trim())) {
      Alert.alert('Invalid Format', 'Please enter a valid Indian mobile number starting with +91');
      return;
    }
    if (!content.trim()) {
      Alert.alert('Empty Message', 'Message content cannot be empty.');
      return;
    }

    setIsSending(true);

    const message: EmergencyMessage = {
      id: generateTrackingId(),
      recipient,
      content,
      status: 'QUEUED_OFFLINE',
      priority,
      retryCount: 0,
      timestampCreated: Date.now(),
    };

    try {
      const dispatched = await SmsDispatcher.dispatch(message);
      
      if (dispatched) {
        message.status = 'SENT_RADIO';
        message.timestampSent = Date.now();
      }
      
      const proceed = await addMessage(message);
      
      if (proceed) {
        navigation.goBack();
      }
    } catch (e) {
      Alert.alert('Dispatch Error', 'Failed to interact with native SMS module.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={styles.cardTitle}>New Alert.</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>To</Text>
          <TextInput
            style={styles.input}
            placeholder="+91"
            keyboardType="phone-pad"
            value={recipient}
            onChangeText={setRecipient}
            placeholderTextColor="#52525B"
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Message</Text>
            <Text style={styles.counter}>{content.length} / {MAX_CHARS}</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the emergency..."
            multiline
            maxLength={MAX_CHARS}
            numberOfLines={4}
            value={content}
            onChangeText={setContent}
            placeholderTextColor="#52525B"
          />
        </View>

        <View style={styles.priorityWrapper}>
           <PrioritySelector priority={priority} onChange={setPriority} />
        </View>

        <TouchableOpacity 
          activeOpacity={0.8}
          style={[styles.sendButton, isSending && styles.sendButtonDisabled]} 
          onPress={handleSend}
          disabled={isSending}
        >
          <Text style={styles.sendButtonText}>
            {isSending ? 'Sending...' : 'Send Alert'}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', 
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#000000',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '300',
  },
  keyboardView: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  cardTitle: {
    fontSize: 34,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 40,
  },
  inputGroup: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#71717A',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  counter: {
    fontSize: 12,
    fontWeight: '400',
    color: '#71717A',
  },
  input: {
    backgroundColor: '#000000',
    fontSize: 18,
    color: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
    paddingVertical: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#27272A',
    borderBottomWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  priorityWrapper: {
    marginBottom: 40,
  },
  sendButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});
