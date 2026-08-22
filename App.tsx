import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MessageProvider } from './src/context/MessageContext';

const App = () => {
  return (
    <SafeAreaProvider>
      <MessageProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </MessageProvider>
    </SafeAreaProvider>
  );
};

export default App;
