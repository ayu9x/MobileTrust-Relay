import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './apps/mobile/src/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MessageProvider } from './apps/mobile/src/context/MessageContext';
import { enableScreens } from 'react-native-screens';
import { StatusBar } from 'react-native';

enableScreens(false);

const App = () => {
  return (
    <SafeAreaProvider>
      <StatusBar backgroundColor="#0B0F19" barStyle="light-content" translucent={false} />
      <MessageProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </MessageProvider>
    </SafeAreaProvider>
  );
};

export default App;
