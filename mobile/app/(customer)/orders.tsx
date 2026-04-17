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
import { useAuthStore } from '../../src/store/auth.store';
import { useTranslation } from '../../src/i18n';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface StatusConfig {
  label: string;
  color: string;
  bg: string;
  icon: IoniconsName;
}

function getStatusMap(tr: (key: string) => string): Record<string, StatusConfig> {
  return {
    PENDING:    { label: tr('status_pending'),    color: Colors.statusPending,    bg: '#FFF3E0', icon: 'time-outline' },
    ACCEPTED:   { label: tr('status_accepted'),   color: Colors.statusAccepted,   bg: '#E3F2FD', icon: 'checkmark-circle-outline' },
    READY:      { label: tr('status_ready'),      color: Colors.statusReady,      bg: '#F3E5F5', icon: 'cube-outline' },
    DELIVERING: { label: tr('status_delivering'), color: Colors.statusDelivering, bg: '#FBE9E7', icon: 'bicycle-outline' },
    DELIVERED:  { label: tr('status_delivered'),  color: Colors.statusDelivered,  bg: '#E8F5E9', icon: 'checkmark-done-outline' },
    CANCELLED:  { label: tr('status_cancelled'),  color: Colors.statusCancelled,  bg: '#F5F5F5', icon: 'close-circle-outline' },
  };
}

function getFilterTabs(tr: (key: string) => string) {
  return [
    { label: tr('filter_all'),       value: undefined },
    { label: tr('filter_active'),    value: 'ACCEPTED' },
    { label: tr('filter_waiting'),   value: 'PENDING' },
    { label: tr('filter_delivered'), value: 'DELIVERED' },
    { label: tr('filter_cancelled'), value: 'CANCELLED' },
  ];
}

export default function OrdersScreen() {
  const router = useRouter();
  const { lang, t, tr } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const [activeFilter, setActiveFilter] = useState<string | undefined>(undefined);
  const STATUS_MAP = getStatusMap(tr);
  const FILTER_TABS = getFilterTabs(tr);

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['my-orders', activeFilter],
    queryFn: () => ordersApi.getMyOrders(activeFilter),
    enabled: isAuthenticated,
  });

  const list = Array.isArray(orders) ? orders : [];

  // Not logged in — show login prompt
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <Text style={s.title}>{tr('orders_title')}</Text>
        </View>
        <View style={s.loginWrap}>
          <View style={s.loginIconBox}>
            <Ionicons name="cube-outline" size={44} color={Colors.primaryLight} />
          </View>
          <Text style={s.loginTitle}>{lang === 'ru' ? 'Войдите, чтобы видеть заказы' : "Buyurtmalarni ko'rish uchun kiring"}</Text>
          <Text style={s.loginSub}>{lang === 'ru' ? 'Все ваши заказы будут здесь' : "Barcha buyurtmalaringiz shu yerda ko'rinadi"}</Text>
          <TouchableOpacity style={s.loginBtn} onPress={() => router.push('/(auth)/login')} activeOpacity={0.85}>
            <Ionicons name="log-in-outline" size={18} color={Colors.white} />
            <Text style={s.loginBtnTxt}>{tr('login')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.title}>{tr('orders_title')}</Text>
        <Text style={s.subtitle}>{list.length} {lang === 'ru' ? 'заказов' : 'ta buyurtma'}</Text>

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
              <Text style={s.emptyTitle}>{tr('order_empty')}</Text>
              <Text style={s.emptySub}>
                {activeFilter
                  ? (lang === 'ru' ? 'Заказов с этим статусом не найдено' : "Bu holat bo'yicha buyurtma topilmadi")
                  : tr('order_empty_sub')}
              </Text>
              <TouchableOpacity style={s.shopBtn} onPress={() => router.push('/(customer)/home')}>
                <Text style={s.shopBtnTxt}>{tr('order_shop')}</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        renderItem={({ item }) => <OrderCard item={item} statusMap={STATUS_MAP} lang={lang} onPress={() =>
          router.push({ pathname: '/(customer)/order/[id]', params: { id: item.id } })
        } />}
      />
    </SafeAreaView>
  );
}

function OrderCard({ item, statusMap, lang, onPress }: { item: any; statusMap: Record<string, StatusConfig>; lang: string; onPress: () => void }) {
  const cfg = statusMap[item.status] ?? statusMap.PENDING;
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
          <Text style={s.metaTxt}>{item.items?.length ?? 0} {lang === 'ru' ? 'товаров' : 'ta mahsulot'}</Text>
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
  safe: { flex: 1, backgroundColor: Colors.primary },

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

  list: { flexGrow: 1, backgroundColor: Colors.background, padding: Spacing.md, gap: Spacing.sm, paddingBottom: 100 },

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

  loginWrap: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  loginIconBox: { width: 96, height: 96, borderRadius: 28, backgroundColor: Colors.primarySurface, alignItems: 'center', justifyContent: 'center' },
  loginTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  loginSub: { fontSize: 13, color: Colors.textHint, textAlign: 'center', lineHeight: 19 },
  loginBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: 13, borderRadius: Radius.full, marginTop: Spacing.sm, ...Shadow.sm },
  loginBtnTxt: { fontSize: 15, fontWeight: '700', color: Colors.white },
});
