import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius } from '../../theme';

type OrderStatus = 'PENDING' | 'ACCEPTED' | 'READY' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED';

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string }> = {
  PENDING: { label: "Kutilmoqda", bg: Colors.warningSurface, text: Colors.warning },
  ACCEPTED: { label: "Qabul qilindi", bg: Colors.infoSurface, text: Colors.info },
  READY: { label: "Tayyor", bg: '#EDE7F6', text: '#7B1FA2' },
  DELIVERING: { label: "Yo'lda", bg: '#FBE9E7', text: '#D84315' },
  DELIVERED: { label: "Yetkazildi", bg: Colors.successSurface, text: Colors.success },
  CANCELLED: { label: "Bekor qilindi", bg: '#F5F5F5', text: Colors.textSecondary },
};

interface StatusBadgeProps {
  status: OrderStatus;
  style?: ViewStyle;
}

export function StatusBadge({ status, style }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, style]}>
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

interface BadgeProps {
  label: string;
  color?: string;
  bg?: string;
  style?: ViewStyle;
}

export function Badge({ label, color = Colors.primary, bg = Colors.primarySurface, style }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
