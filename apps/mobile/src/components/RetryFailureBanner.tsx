import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  isVisible: boolean;
  onResend: () => void;
  onMarkCritical: () => void;
}

export const RetryFailureBanner: React.FC<Props> = ({ isVisible, onResend, onMarkCritical }) => {
  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.icon}>⚠</Text>
          <Text style={styles.title}>CRITICAL FAILURE</Text>
        </View>
        <TouchableOpacity style={styles.dismissBtn} onPress={onMarkCritical} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.dismissBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.message}>
        Message failed to deliver after 3 attempts. The network is completely down or recipient is unreachable.
      </Text>
      
      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnResend} onPress={onResend} activeOpacity={0.7}>
          <Text style={styles.btnResendText}>Resend via Alternate</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.btnCritical} onPress={onMarkCritical} activeOpacity={0.7}>
          <Text style={styles.btnCriticalText}>Mark Critical Dropout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dismissBtn: {
    padding: 4,
  },
  dismissBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#991B1B',
  },
  icon: {
    fontSize: 18,
    color: '#DC2626',
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991B1B',
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 13,
    color: '#7F1D1D',
    marginBottom: 16,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  btnResend: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnResendText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  btnCritical: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnCriticalText: {
    color: '#991B1B',
    fontWeight: '700',
    fontSize: 12,
  },
});
