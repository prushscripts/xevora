import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

type StatusBadgeProps = {
  status: 'active' | 'break' | 'completed' | 'pending' | 'approved';
  size?: 'sm' | 'md';
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = {
    active: { label: 'ON SHIFT', color: theme.success, bg: 'rgba(34,197,94,0.1)' },
    break: { label: 'ON BREAK', color: theme.warning, bg: 'rgba(245,158,11,0.1)' },
    completed: { label: 'COMPLETED', color: theme.muted, bg: 'rgba(78,109,146,0.1)' },
    pending: { label: 'PENDING', color: theme.warning, bg: 'rgba(245,158,11,0.1)' },
    approved: { label: 'APPROVED', color: theme.success, bg: 'rgba(34,197,94,0.1)' },
  };

  const { label, color, bg } = config[status];
  const isSmall = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }, isSmall && styles.labelSmall]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  labelSmall: {
    fontSize: 9,
  },
});
