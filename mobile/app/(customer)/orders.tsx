import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../src/theme';
import { StatusBadge } from '../../src/components/ui/Badge';
import { ordersApi } from '../../src/api/orders';

const STATUS_TABS = [
  { label: 'Barchasi', value: undefined },
  { label: 'Kutilmoqda', value: 'PENDING' },
  { label: 'Faol', value: 'ACCEPTED' },
  { label: 'Yetkazildi', value: 'DELIVERED' },
];

export default function OrdersScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['my-orders', activeTab],
    queryFn: () => ordersApi.getMyOrders(activeTab),
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Buyurtmalarim</Text>
      </View>

      {/* Status Tabs */}
      <View style={styles.tabsRow}>
        {STATUS_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.label}
            style={[styles.tab, activeTab === tab.value && styles.tabActive]}
            onPress={() => setActiveTab(tab.value)}
          >
            <Text style={[styles.tabText, activeTab === tab.value && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      ) : (
        <FlatList
          data={orders ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>Buyurtmalar yo'q</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.orderCard}
              onPress={() =>
                router.push({ pathname: '/(customer)/order/[id]', params: { id: item.id } })
              }
              activeOpacity={0.85}
            >
              <View style={styles.orderTop}>
                <View>
                  <Text style={styles.orderNumber}>{item.order_number}</Text>
                  <Text style={styles.storeName}>{item.store?.name}</Text>
                </View>
                <StatusBadge status={item.status} />
              </View>
              <View style={styles.orderBottom}>
                <Text style={styles.itemCount}>
                  {item.items?.length ?? 0} ta mahsulot
                </Text>
                <Text style={styles.totalPrice}>
                  {Number(item.total_price).toLocaleString()} so'm
                </Text>
              </View>
              <Text style={styles.orderType}>
                {item.order_type === 'BROADCAST' ? '📢 Umumiy buyurtma' : '🏪 Do\'kon buyurtmasi'}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    paddingTop: Spacing.sm,
  },
  title: { ...Typography.h4, color: Colors.white },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.background,
  },
  tabActive: { backgroundColor: Colors.primarySurface },
  tabText: { ...Typography.caption, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary },
  list: { padding: Spacing.md, gap: Spacing.sm },
  orderCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadow.sm,
    gap: Spacing.xs,
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumber: { ...Typography.title, fontSize: 15 },
  storeName: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  orderBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCount: { ...Typography.bodySmall, color: Colors.textSecondary },
  totalPrice: { ...Typography.price },
  orderType: { ...Typography.caption, color: Colors.textHint },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyIcon: { fontSize: 48 },
  emptyText: { ...Typography.body, color: Colors.textSecondary },
});
