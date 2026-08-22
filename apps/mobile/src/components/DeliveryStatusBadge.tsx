import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { DeliveryStatus } from '@mobiletrust/shared';

interface Props {
  status: DeliveryStatus;
  retryCount?: number;
}

export const DeliveryStatusBadge: React.FC<Props> = ({ status, retryCount = 0 }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'QUEUED_OFFLINE' || status === 'FAILED_CARRIER') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.7,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status, pulseAnim]);

  const getBadgeConfig = () => {
    switch (status) {
      case 'DELIVERED':
        return { text: 'DELIVERED', bg: '#10B981', color: '#FFFFFF', icon: '✓', shadow: '#059669' };
      case 'SENT_RADIO':
        return { text: 'SENT (CARRIER)', bg: '#3B82F6', color: '#FFFFFF', icon: '→', shadow: '#2563EB' };
      case 'RELAYED_CLOUD':
        return { text: 'RELAYED (CLOUD)', bg: '#8B5CF6', color: '#FFFFFF', icon: '☁', shadow: '#7C3AED' };
      case 'QUEUED_OFFLINE':
        return { text: 'OFFLINE QUEUED', bg: '#F59E0B', color: '#000000', icon: '⏳', shadow: '#D97706' };
      case 'FAILED_CARRIER':
        return { 
          text: `FAILED (${retryCount}/3)`, 
          bg: '#EF4444', 
          color: '#FFFFFF', 
          icon: '⚠',
          shadow: '#DC2626'
        };
      default:
        return { text: 'UNKNOWN', bg: '#6B7280', color: '#FFFFFF', icon: '?', shadow: '#4B5563' };
    }
  };

  const config = getBadgeConfig();

  return (
    <Animated.View 
      style={[
        styles.badge, 
        { 
          backgroundColor: config.bg,
          shadowColor: config.shadow,
          transform: [{ scale: pulseAnim }],
          opacity: pulseAnim,
        }
      ]}
    >
      <Text style={[styles.text, { color: config.color }]}>
        {config.icon} {config.text}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  text: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
