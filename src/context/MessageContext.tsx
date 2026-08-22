import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FirebaseService from '../services/cloud/FirebaseService';
import { Alert } from 'react-native';

export type MessageStatus = 'Sent' | 'Delivered' | 'Failed' | 'Pending';
export type UrgencyLevel = 'Low' | 'High';

export interface Message {
  id: string;
  recipient: string;
  content: string;
  status: MessageStatus;
  urgency: UrgencyLevel;
  timestamp: number;
}

interface MessageContextType {
  messages: Message[];
  addMessage: (msg: Omit<Message, 'id' | 'status' | 'timestamp'>) => Promise<boolean>;
  updateMessageStatus: (id: string, status: MessageStatus) => void;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);

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

  const addMessage = async (msg: Omit<Message, 'id' | 'status' | 'timestamp'>): Promise<boolean> => {
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
      return false; // Indicating we paused for user confirmation
    } else {
      processAddMessage(msg);
      return true;
    }
  };

  const processAddMessage = (msg: Omit<Message, 'id' | 'status' | 'timestamp'>) => {
    const newMessage: Message = {
      ...msg,
      id: Math.random().toString(36).substring(7),
      status: 'Pending',
      timestamp: Date.now(),
    };
    setMessages(prev => [newMessage, ...prev]);
    
    // Sync to cloud
    FirebaseService.syncMessage(newMessage);
  };

  const updateMessageStatus = (id: string, status: MessageStatus) => {
    setMessages(prev => 
      prev.map(m => m.id === id ? { ...m, status } : m)
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
