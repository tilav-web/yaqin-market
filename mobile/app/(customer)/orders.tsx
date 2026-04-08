import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { ordersApi } from '../../src/api/orders';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface StatusConfig {
  label: string;
  color: string;
  bg: string;
  icon: IoniconsName;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  PENDING:    { label: 'Kutilmoqda',  color: Colors.statusPending,    bg: '#FFF3E0', icon: 'time-outline' },
  ACCEPTED:   { label: 'Qabul qilindi', color: Colors.statusAccepted, bg: '#E3F2FD', icon: 'checkmark-circle-outline' },
  READY:      { label: 'Tayyor',      color: Colors.statusReady,      bg: '#F3E5F5', icon: 'cube-outline' },
  DELIVERING: { label: 'Yetkazilmoqda', color: Colors.statusDelivering, bg: '#FBE9E7', icon: 'bicycle-outline' },
  DELIVERED:  { label: 'Yetkazildi', color: Colors.statusDelivered,   bg: '#E8F5E9', icon: 'checkmark-done-outline' },
  CANCELLED:  { label: 'Bekor qilindi', color: Colors.statusCancelled, bg: '#F5F5F5', icon: 'close-circle-outline' },
};

const FILTER_TABS = [
  { label: 'Barchasi', value: undefined },
  { label: 'Faol',     value: 'ACCEPTED' },
  { label: 'Kutmoqda', value: 'PENDING' },
  { label: 'Yetkazildi', value: 'DELIVERED' },
  { label: 'Bekor',    value: 'CANCELLED' },
];

export default function OrdersScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<string | undefined>(undefined);

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['my-orders', activeFilter],
    queryFn: () => ordersApi.getMyOrders(activeFilter),
  });

  const list = Array.isArray(orders) ? orders : [];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.title}>Buyurtmalarim</Text>
        <Text style={s.subtitle}>{list.length} ta buyurtma</Text>

        {/* Filter tabs */}
        <FlatList
          data={FILTER_TABS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={i => String(i.value ?? 'all')}
          contentContainerStyle={s.filterList}
          renderItem={({ item }) => {
            const active = activeFilter === item.value;
            return (
              <TouchableOpacity
                style={[s.filterChip, active && s.filterChipActive]}
                onPress={() => setActiveFilter(item.value)}
              >
                <Text style={[s.filterTxt, active && s.filterTxtActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* ── List ── */}
      <FlatList
        data={list}
        keyExtractor={item => item.id}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.primary} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={s.empty}>
              <View style={s.emptyIconBox}>
                <Ionicons name="cube-outline" size={44} color={Colors.primaryLight} />
              </View>
              <Text style={s.emptyTitle}>Buyurtmalar yo'q</Text>
              <Text style={s.emptySub}>
                {activeFilter ? 'Bu holat bo\'yicha buyurtma topilmadi' : 'Hali birorta buyurtma bermadingiz'}
              </Text>
              <TouchableOpacity style={s.shopBtn} onPress={() => router.push('/(customer)/home')}>
                <Text style={s.shopBtnTxt}>Xarid qilish</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        renderItem={({ item }) => <OrderCard item={item} onPress={() =>
          router.push({ pathname: '/(customer)/order/[id]', params: { id: item.id } })
        } />}
      />
    </SafeAreaView>
  );
}

function OrderCard({ item, onPress }: { item: any; onPress: () => void }) {
  const cfg = STATUS_MAP[item.status] ?? STATUS_MAP.PENDING;
  const isDirectOrder = item.order_type !== 'BROADCAST';

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.88}>
      {/* Top row */}
      <View style={s.cardTop}>
        <View style={s.orderTypeRow}>
          <View style={s.orderTypeIcon}>
            <Ionicons
              name={isDirectOrder ? 'storefront-outline' : 'megaphone-outline'}
              size={14}
              color={Colors.primary}
            />
          </View>
          <View>
            <Text style={s.orderNum}>{item.order_number}</Text>
            {item.store?.name && <Text style={s.storeName}>{item.store.name}</Text>}
          </View>
        </View>
        <View style={[s.statusPill, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={12} color={cfg.color} />
          <Text style={[s.statusTxt, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={s.cardDivider} />

      {/* Bottom row */}
      <View style={s.cardBottom}>
        <View style={s.metaItem}>
          <Ionicons name="layers-outline" size={13} color={Colors.textHint} />
          <Text style={s.metaTxt}>{item.items?.length ?? 0} ta mahsulot</Text>
        </View>
        <View style={s.metaItem}>
          <Ionicons name="time-outline" size={13} color={Colors.textHint} />
          <Text style={s.metaTxt}>{formatDate(item.created_at)}</Text>
        </View>
        <Text style={s.price}>{Number(item.total_price).toLocaleString()} so'm</Text>
      </View>

      {/* Progress dots for active orders */}
      {['ACCEPTED', 'DELIVERING'].includes(item.status) && (
        <View style={s.progressRow}>
          {(['PENDING', 'ACCEPTED', 'READY', 'DELIVERING', 'DELIVERED'] as const).map((step, i) => {
            const steps = ['PENDING', 'ACCEPTED', 'READY', 'DELIVERING', 'DELIVERED'];
            const done = steps.indexOf(item.status) >= i;
            return (
              <React.Fragment key={step}>
                <View style={[s.progressDot, done && s.progressDotDone]} />
                {i < 4 && <View style={[s.progressLine, done && steps.indexOf(item.status) > i && s.progressLineDone]} />}
              </React.Fragment>
            );
          })}
        </View>
      )}
    </TouchableOpacity>
  );
}

function formatDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'android' ? Spacing.xs : 0,
    paddingBottom: Spacing.sm,
    gap: 4,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: { fontSize: 22, fontWeight: '800', color: Colors.white },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 4 },
  filterList: { gap: Spacing.xs, paddingBottom: 4 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  filterChipActive: { backgroundColor: Colors.white },
  filterTxt: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  filterTxtActive: { color: Colors.primary },

  list: { padding: Spacing.md, gap: Spacing.sm },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.sm,
    gap: Spacing.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderTypeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  orderTypeIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  orderNum: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  storeName: { fontSize: 12, color: Colors.textHint, marginTop: 1 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: Radius.full,
  },
  statusTxt: { fontSize: 11, fontWeight: '700' },

  cardDivider: { height: 1, backgroundColor: Colors.divider },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt: { fontSize: 12, color: Colors.textHint },
  price: { marginLeft: 'auto', fontSize: 15, fontWeight: '800', color: Colors.primary },

  progressRow: { flexDirection: 'row', alignItems: 'center' },
  progressDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.border,
  },
  progressDotDone: { backgroundColor: Colors.primary },
  progressLine: { flex: 1, height: 2, backgroundColor: Colors.border },
  progressLineDone: { backgroundColor: Colors.primary },

  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyIconBox: {
    width: 96, height: 96, borderRadius: 28,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: 13, color: Colors.textHint, textAlign: 'center', paddingHorizontal: 40 },
  shopBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    marginTop: Spacing.md,
  },
  shopBtnTxt: { fontSize: 15, fontWeight: '700', color: Colors.white },
});
