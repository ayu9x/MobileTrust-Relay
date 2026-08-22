import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './apps/mobile/src/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MessageProvider } from './apps/mobile/src/context/MessageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setStorage } from './apps/mobile/src/services/asyncStorage';

// Wire native AsyncStorage as the storage engine
setStorage(AsyncStorage);

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
