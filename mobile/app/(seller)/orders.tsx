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

const TABS = [
  { label: 'Barchasi', value: undefined },
  { label: 'Yangi', value: 'PENDING' },
  { label: 'Qabul', value: 'ACCEPTED' },
  { label: 'Tayyor', value: 'READY' },
  { label: 'Yetkazildi', value: 'DELIVERED' },
];

export default function SellerOrdersScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['store-orders', activeTab],
    queryFn: () => ordersApi.getStoreOrders(activeTab),
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Buyurtmalar</Text>
      </View>

      <View style={styles.tabsRow}>
        {TABS.map((tab) => (
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
              style={styles.card}
              onPress={() =>
                router.push({ pathname: '/(seller)/order/[id]', params: { id: item.id } })
              }
              activeOpacity={0.85}
            >
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.orderNum}>{item.order_number}</Text>
                  <Text style={styles.customerName}>
                    👤 {item.customer?.first_name} {item.customer?.last_name}
                  </Text>
                </View>
                <StatusBadge status={item.status} />
              </View>
              <View style={styles.cardBottom}>
                <View style={[styles.typePill,
                  item.order_type === 'BROADCAST' ? styles.typeBroadcast : styles.typeDirect
                ]}>
                  <Text style={styles.typeText}>
                    {item.order_type === 'BROADCAST' ? '📢 Umumiy' : '🏪 To\'g\'ridan'}
                  </Text>
                </View>
                <Text style={styles.price}>{Number(item.total_price).toLocaleString()} so'm</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, padding: Spacing.md },
  title: { ...Typography.h4, color: Colors.white },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexWrap: 'wrap',
  },
  tab: { paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.background },
  tabActive: { backgroundColor: Colors.primarySurface },
  tabText: { ...Typography.caption, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary },
  list: { padding: Spacing.md, gap: Spacing.sm },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadow.sm,
    gap: Spacing.xs,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderNum: { ...Typography.title, fontSize: 15 },
  customerName: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typePill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full },
  typeDirect: { backgroundColor: Colors.infoSurface },
  typeBroadcast: { backgroundColor: Colors.warningSurface },
  typeText: { fontSize: 12, fontWeight: '600' },
  price: { ...Typography.bodySmall, fontWeight: '700', color: Colors.primary },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyIcon: { fontSize: 48 },
  emptyText: { ...Typography.body, color: Colors.textSecondary },
});
