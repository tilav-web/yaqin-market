import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../src/theme';
import { StatusBadge } from '../../src/components/ui/Badge';
import { ordersApi } from '../../src/api/orders';
import { storesApi } from '../../src/api/stores';
import { useSocket } from '../../src/hooks/useSocket';

export default function SellerDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: myStores } = useQuery({
    queryKey: ['my-stores'],
    queryFn: storesApi.getMyStores,
  });

  const { data: pendingOrders, refetch, isLoading } = useQuery({
    queryKey: ['store-orders', 'PENDING'],
    queryFn: () => ordersApi.getStoreOrders('PENDING'),
  });

  const { data: allOrders } = useQuery({
    queryKey: ['store-orders'],
    queryFn: () => ordersApi.getStoreOrders(),
  });

  useSocket('seller', (event, data) => {
    if (event === 'order:new-direct') {
      queryClient.invalidateQueries({ queryKey: ['store-orders'] });
    }
    if (event === 'broadcast:request_created') {
      queryClient.invalidateQueries({ queryKey: ['broadcast-feed'] });
    }
  });

  const store = myStores?.[0];
  const todayOrders = allOrders?.filter((o: any) => {
    const today = new Date();
    const orderDate = new Date(o.createdAt);
    return (
      orderDate.getDate() === today.getDate() &&
      orderDate.getMonth() === today.getMonth()
    );
  }) ?? [];

  const todayRevenue = todayOrders
    .filter((o: any) => o.status === 'DELIVERED')
    .reduce((sum: number, o: any) => sum + Number(o.total_price), 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Assalomu alaykum 👋</Text>
          <Text style={styles.storeName}>{store?.name ?? 'Do\'konim'}</Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: store?.is_active ? Colors.success : Colors.error }]} />
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.primary} />
        }
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{todayOrders.length}</Text>
            <Text style={styles.statLabel}>Bugungi</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.warning }]}>
              {pendingOrders?.length ?? 0}
            </Text>
            <Text style={styles.statLabel}>Kutilmoqda</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.success, fontSize: 14 }]}>
              {todayRevenue.toLocaleString()} so'm
            </Text>
            <Text style={styles.statLabel}>Daromad</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tezkor amallar</Text>
          <View style={styles.actionsRow}>
            {[
              { icon: '📢', label: 'Umumiy buyurtmalar', path: '/(seller)/broadcast-feed' },
              { icon: '📦', label: 'Barcha buyurtmalar', path: '/(seller)/orders' },
              { icon: '🛍️', label: 'Mahsulotlar', path: '/(seller)/products' },
            ].map((action) => (
              <TouchableOpacity
                key={action.label}
                style={styles.actionCard}
                onPress={() => router.push(action.path as any)}
              >
                <Text style={styles.actionIcon}>{action.icon}</Text>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Pending Orders */}
        {(pendingOrders?.length ?? 0) > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>⏳ Kutilayotgan buyurtmalar</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{pendingOrders?.length}</Text>
              </View>
            </View>
            {pendingOrders?.slice(0, 5).map((order: any) => (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                onPress={() =>
                  router.push({
                    pathname: '/(seller)/order/[id]',
                    params: { id: order.id },
                  })
                }
              >
                <View style={styles.orderTop}>
                  <Text style={styles.orderNumber}>{order.order_number}</Text>
                  <View style={[styles.typeBadge,
                    order.order_type === 'BROADCAST' ? styles.typeBroadcast : styles.typeDirect
                  ]}>
                    <Text style={styles.typeText}>
                      {order.order_type === 'BROADCAST' ? '📢' : '🏪'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.orderItems}>
                  {order.items?.length} ta mahsulot • {Number(order.total_price).toLocaleString()} so'm
                </Text>
                <Text style={styles.orderTime}>
                  {new Date(order.createdAt).toLocaleTimeString('uz-UZ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: { ...Typography.caption, color: 'rgba(255,255,255,0.8)' },
  storeName: { ...Typography.h4, color: Colors.white },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  scroll: { flex: 1 },
  statsRow: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadow.sm,
  },
  statValue: { ...Typography.h3, color: Colors.primary },
  statLabel: { ...Typography.caption, color: Colors.textHint, marginTop: 2 },
  section: { paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  sectionTitle: { ...Typography.title, flex: 1 },
  countBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  countBadgeText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
    ...Shadow.sm,
  },
  actionIcon: { fontSize: 28 },
  actionLabel: { ...Typography.caption, textAlign: 'center', fontWeight: '500' },
  orderCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadow.sm,
    marginBottom: Spacing.xs,
    gap: 4,
  },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNumber: { ...Typography.title, fontSize: 15 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  typeDirect: { backgroundColor: Colors.infoSurface },
  typeBroadcast: { backgroundColor: Colors.warningSurface },
  typeText: { fontSize: 14 },
  orderItems: { ...Typography.bodySmall, color: Colors.textSecondary },
  orderTime: { ...Typography.caption, color: Colors.textHint },
});
