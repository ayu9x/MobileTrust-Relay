import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('@react-native-firebase/app', () => {
  return {
    initializeApp: jest.fn(),
    app: jest.fn(),
  };
});
jest.mock('@react-native-firebase/firestore', () => {
  return () => ({
    collection: jest.fn(),
  });
});
