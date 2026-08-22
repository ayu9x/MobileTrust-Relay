import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MessagePriority } from '@mobiletrust/shared';

interface Props {
  priority: MessagePriority;
  onChange: (p: MessagePriority) => void;
}

export const PrioritySelector: React.FC<Props> = ({ priority, onChange }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>PRIORITY</Text>
      <View style={styles.row}>
        <TouchableOpacity 
          activeOpacity={0.7}
          style={[styles.optionBtn, priority === 'STANDARD' && styles.activeStandard]}
          onPress={() => onChange('STANDARD')}
        >
          <Text style={[styles.optionText, priority === 'STANDARD' && styles.activeStandardText]}>
            Standard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          activeOpacity={0.7}
          style={[styles.optionBtn, priority === 'HIGH_URGENT' && styles.activeUrgent]}
          onPress={() => onChange('HIGH_URGENT')}
        >
          <View style={[styles.dot, priority === 'HIGH_URGENT' ? { backgroundColor: '#EF4444' } : { backgroundColor: '#3F3F46' }]} />
          <Text style={[styles.optionText, priority === 'HIGH_URGENT' && styles.activeUrgentText]}>
            High Urgent
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: '#71717A',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  optionBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272A',
    backgroundColor: '#09090B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeStandard: {
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
  },
  activeUrgent: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#71717A',
    letterSpacing: 0.5,
  },
  activeStandardText: {
    color: '#000000',
    fontWeight: '600',
  },
  activeUrgentText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  }
});
