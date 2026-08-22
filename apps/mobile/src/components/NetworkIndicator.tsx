import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  isOffline: boolean;
}

export const NetworkIndicator: React.FC<Props> = ({ isOffline }) => {
  if (!isOffline) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📡</Text>
      <View style={styles.textCol}>
        <Text style={styles.title}>OFFLINE DISASTER MODE</Text>
        <Text style={styles.subtitle}>Alerts queued locally in 15MB budget (Valid for 2 hrs)</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#B91C1C',
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EF4444',
  },
  icon: {
    fontSize: 18,
    marginRight: 10,
  },
  textCol: {
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#FECACA',
    fontSize: 11,
    fontWeight: '500',
  },
});

