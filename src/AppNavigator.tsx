import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/HomeScreen';
import SendMessageScreen from './screens/SendMessageScreen';

export type RootStackParamList = {
  Home: undefined;
  SendMessage: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ title: 'MobileTrust Relay' }} 
      />
      <Stack.Screen 
        name="SendMessage" 
        component={SendMessageScreen} 
        options={{ title: 'Send Emergency SMS' }} 
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
