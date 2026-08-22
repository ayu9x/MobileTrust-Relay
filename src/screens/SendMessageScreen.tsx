import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Switch, Alert, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMessages, UrgencyLevel } from '../context/MessageContext';

const SendMessageScreen = () => {
  const navigation = useNavigation();
  const { addMessage } = useMessages();
  
  const [recipient, setRecipient] = useState('');
  const [content, setContent] = useState('');
  const [isHighUrgency, setIsHighUrgency] = useState(false);

  const handleSend = async () => {
    if (!recipient.trim() || !content.trim()) {
      Alert.alert('Error', 'Please enter a recipient and message content.');
      return;
    }

    const urgency: UrgencyLevel = isHighUrgency ? 'High' : 'Low';

    // In a real app, this is where Harsh's SMS API call would go
    // e.g., NativeModules.SmsManager.sendSMS(recipient, content)

    const sentImmediately = await addMessage({ recipient, content, urgency });
    if (sentImmediately) {
      navigation.goBack();
    }
    // If sentImmediately is false, it means a duplicate warning was shown.
    // The user can still choose to send it from the alert, but they'll have to manually go back or we can pass a callback.
    // For MVP, we'll keep it simple: if duplicate warning shows, user can re-trigger or cancel.
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Recipient Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="+1234567890"
          keyboardType="phone-pad"
          value={recipient}
          onChangeText={setRecipient}
        />

        <Text style={styles.label}>Emergency Message</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe the situation..."
          multiline
          numberOfLines={4}
          value={content}
          onChangeText={setContent}
        />

        <View style={styles.switchContainer}>
          <Text style={styles.label}>High Urgency</Text>
          <Switch
            value={isHighUrgency}
            onValueChange={setIsHighUrgency}
            trackColor={{ false: '#767577', true: '#FFCDD2' }}
            thumbColor={isHighUrgency ? '#F44336' : '#f4f3f4'}
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSend}>
          <Text style={styles.buttonText}>Send SMS & Track</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  form: { padding: 16 },
  label: { fontSize: 16, fontWeight: '500', marginBottom: 8, color: '#424242' },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#F44336',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});

export default SendMessageScreen;
