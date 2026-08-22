import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FirebaseService from '../services/cloud/FirebaseService';
import { Alert } from 'react-native';
import { EmergencyMessage, DeliveryStatus } from '@mobiletrust/shared';

interface MessageContextType {
  messages: EmergencyMessage[];
  addMessage: (msg: EmergencyMessage) => Promise<boolean>;
  updateMessageStatus: (id: string, status: DeliveryStatus) => void;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<EmergencyMessage[]>([]);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const stored = await AsyncStorage.getItem('@messages');
        if (stored) {
          setMessages(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to load messages', e);
      }
    };
    loadMessages();
    FirebaseService.initialize();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('@messages', JSON.stringify(messages)).catch(e => 
      console.error('Failed to save messages', e)
    );
  }, [messages]);

  const addMessage = async (msg: EmergencyMessage): Promise<boolean> => {
    const isDuplicate = await FirebaseService.isDuplicate(msg.recipient, msg.content);
    
    if (isDuplicate) {
      Alert.alert(
        'Duplicate Message Detected',
        'A similar message was sent to this recipient recently. Are you sure you want to send it again?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => {} },
          { 
            text: 'Send Anyway', 
            style: 'destructive',
            onPress: () => processAddMessage(msg)
          }
        ]
      );
      return false;
    } else {
      processAddMessage(msg);
      return true;
    }
  };

  const processAddMessage = (msg: EmergencyMessage) => {
    setMessages(prev => [msg, ...prev]);
    FirebaseService.syncMessage(msg);
  };

  const updateMessageStatus = (id: string, status: DeliveryStatus) => {
    setMessages(prev => 
      prev.map(m => m.id === id ? { ...m, status, retryCount: status === 'FAILED_CARRIER' ? m.retryCount + 1 : m.retryCount } : m)
    );
  };

  return (
    <MessageContext.Provider value={{ messages, addMessage, updateMessageStatus }}>
      {children}
    </MessageContext.Provider>
  );
};

export const useMessages = () => {
  const ctx = useContext(MessageContext);
  if (!ctx) throw new Error('useMessages must be used within MessageProvider');
  return ctx;
};
