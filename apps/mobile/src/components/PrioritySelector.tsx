import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableWithoutFeedback, Animated } from 'react-native';
import { MessagePriority } from '@mobiletrust/shared';

interface Props {
  priority: MessagePriority;
  onChange: (p: MessagePriority) => void;
}

export const PrioritySelector: React.FC<Props> = ({ priority, onChange }) => {
  const slideAnim = useRef(new Animated.Value(priority === 'HIGH_URGENT' ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: priority === 'HIGH_URGENT' ? 1 : 0,
      useNativeDriver: false, // width/colors usually can't use native driver without specific setups, but we are just translating X. Let's use false for simple layout manipulation or true if we just translate.
      friction: 6,
      tension: 40,
    }).start();
  }, [priority, slideAnim]);

  const toggle = () => {
    onChange(priority === 'STANDARD' ? 'HIGH_URGENT' : 'STANDARD');
  };

  const activeColor = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#F59E0B', '#EF4444'] // Amber to Red
  });

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 156] // Approximate width jumps
  });

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Message Priority</Text>
      <TouchableWithoutFeedback onPress={toggle}>
        <View style={styles.switchContainer}>
          <Animated.View style={[styles.activeBg, { backgroundColor: activeColor, transform: [{ translateX }] }]} />
          
          <View style={styles.option}>
            <Text style={[styles.text, priority === 'STANDARD' && styles.activeText]}>
              🟡 STANDARD
            </Text>
          </View>
          <View style={styles.option}>
            <Text style={[styles.text, priority === 'HIGH_URGENT' && styles.activeText]}>
              🔴 HIGH URGENT
            </Text>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    height: 44,
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    position: 'relative',
    overflow: 'hidden',
  },
  activeBg: {
    position: 'absolute',
    width: '45%',
    height: 36,
    top: 4,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  option: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  activeText: {
    color: '#FFFFFF',
  },
});
