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
            toValue: 0.5,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
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
        return { text: 'Delivered', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' };
      case 'SENT_RADIO':
        return { text: 'Sent via Carrier', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' };
      case 'SENT':
        return { text: 'Sent to Server', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' };
      case 'RELAYED_CLOUD':
        return { text: 'Relayed to Cloud', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' };
      case 'QUEUED_OFFLINE':
        return { text: 'Queued Offline', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' };
      case 'FAILED_CARRIER':
      case 'FAILED':
        return { 
          text: `Failed (${retryCount}/3)`, 
          color: '#EF4444', 
          bg: 'rgba(239, 68, 68, 0.1)'
        };
      default:
        return { text: 'Unknown', color: '#71717A', bg: 'rgba(113, 113, 122, 0.1)' };
    }
  };

  const config = getBadgeConfig();

  return (
    <Animated.View 
      style={[
        styles.badge, 
        { 
          backgroundColor: config.bg,
          opacity: pulseAnim,
        }
      ]}
    >
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.text, { color: config.color }]}>
        {config.text}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
