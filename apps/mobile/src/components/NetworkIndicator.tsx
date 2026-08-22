import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface Props {
  isOffline: boolean;
}

export const NetworkIndicator: React.FC<Props> = ({ isOffline }) => {
  if (!isOffline) return null;

  return (
    <View style={styles.container}>
      <View style={styles.glassBg} />
      <Text style={styles.icon}>📡</Text>
      <View>
        <Text style={styles.title}>Offline Mode</Text>
        <Text style={styles.subtitle}>Relay queued for up to 2 hours.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    elevation: 10,
  },
  glassBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  subtitle: {
    color: '#D1D5DB',
    fontSize: 12,
  },
});
