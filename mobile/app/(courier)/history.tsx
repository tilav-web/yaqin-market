import React from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { ordersApi } from '../../src/api/orders';

const COURIER_COLOR = '#FF5722';

function fmt(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function CourierHistoryScreen() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['courier-history'],
    queryFn: () => ordersApi.getMyCourierOrders('DELIVERED'),
  });

  const orders = Array.isArray(data) ? data : [];

  const totalEarnings = orders.reduce((sum: number, o: any) => sum + Number(o.total_price ?? 0), 0);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.title}>Tarix</Text>
            <Text style={s.subtitle}>{orders.length} ta yetkazildi</Text>
          </View>
          <View style={s.earningsPill}>
            <Ionicons name="cash-outline" size={14} color="#A5D6A7" />
            <Text style={s.earningsTxt}>{totalEarnings.toLocaleString()} so'm</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={orders}
        keyExtractor={i => i.id}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={COURIER_COLOR}
            colors={[COURIER_COLOR]}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={s.empty}>
              <View style={s.emptyIconBox}>
                <Ionicons name="time-outline" size={44} color="#FFCCBC" />
              </View>
              <Text style={s.emptyTitle}>Tarix bo'sh</Text>
              <Text style={s.emptySub}>Yetkazib bergan buyurtmalar shu yerda ko'rinadi</Text>
            </View>
          ) : null
        }
        renderItem={({ item: order }) => (
          <View style={s.card}>
            <View style={s.cardTop}>
              <View style={s.orderInfo}>
                <View style={s.orderIconBox}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                </View>
                <View>
                  <Text style={s.orderNum}>{order.order_number}</Text>
                  <Text style={s.storeName}>{order.store?.name}</Text>
                </View>
              </View>
              <Text style={s.price}>{Number(order.total_price).toLocaleString()} so'm</Text>
            </View>

            <View style={s.divider} />

            <View style={s.metaRow}>
              <View style={s.metaItem}>
                <Ionicons name="location-outline" size={13} color={Colors.textHint} />
                <Text style={s.metaTxt} numberOfLines={1}>{order.delivery_address}</Text>
              </View>
              <View style={s.metaItem}>
                <Ionicons name="time-outline" size={13} color={Colors.textHint} />
                <Text style={s.metaTxt}>{fmt(order.delivered_at ?? order.updatedAt ?? order.created_at)}</Text>
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: COURIER_COLOR,
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'android' ? Spacing.xs : 0,
    paddingBottom: Spacing.md,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  title: { fontSize: 22, fontWeight: '800', color: Colors.white },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  earningsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: Radius.full,
  },
  earningsTxt: { fontSize: 12, fontWeight: '700', color: Colors.white },

  list: { padding: Spacing.md, gap: Spacing.sm },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, ...Shadow.sm, gap: Spacing.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  orderIconBox: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' },
  orderNum: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  storeName: { fontSize: 12, color: Colors.textHint, marginTop: 1 },
  price: { fontSize: 15, fontWeight: '800', color: Colors.success },
  divider: { height: 1, backgroundColor: Colors.divider },
  metaRow: { gap: 5 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaTxt: { fontSize: 12, color: Colors.textSecondary, flex: 1 },

  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyIconBox: { width: 88, height: 88, borderRadius: 24, backgroundColor: '#FBE9E7', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: 13, color: Colors.textHint, textAlign: 'center', paddingHorizontal: 40, lineHeight: 19 },
});
