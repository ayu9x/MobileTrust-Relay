import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HistoryScreen } from './screens/HistoryScreen';
import { DispatchScreen } from './screens/DispatchScreen';
import { MessageDetailModal } from './screens/MessageDetailModal';

export type RootStackParamList = {
  History: undefined;
  Dispatch: undefined;
  MessageDetail: { messageId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  return (
    <Stack.Navigator 
      initialRouteName="History"
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: '#0B0F19' },
        headerTintColor: '#F8FAFC',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen 
        name="History" 
        component={HistoryScreen} 
        options={{ title: 'MobileTrust Relay' }} 
      />
      <Stack.Screen 
        name="Dispatch" 
        component={DispatchScreen} 
        options={{ title: 'Emergency Dispatch' }} 
      />
      <Stack.Screen 
        name="MessageDetail" 
        component={MessageDetailModal} 
        options={{ title: 'Delivery Timeline', presentation: 'modal' }} 
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
