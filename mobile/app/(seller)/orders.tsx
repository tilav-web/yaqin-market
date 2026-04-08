import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { ordersApi } from '../../src/api/orders';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: IoniconsName }> = {
  PENDING:    { label: 'Yangi',        color: Colors.statusPending,    bg: '#FFF3E0', icon: 'time-outline' },
  ACCEPTED:   { label: 'Qabul qilindi', color: Colors.statusAccepted,  bg: '#E3F2FD', icon: 'checkmark-circle-outline' },
  READY:      { label: 'Tayyor',       color: Colors.statusReady,      bg: '#F3E5F5', icon: 'cube-outline' },
  DELIVERING: { label: 'Yetkazmoqda', color: Colors.statusDelivering, bg: '#FBE9E7', icon: 'bicycle-outline' },
  DELIVERED:  { label: 'Yetkazildi',  color: Colors.statusDelivered,  bg: '#E8F5E9', icon: 'checkmark-done-outline' },
  CANCELLED:  { label: 'Bekor',       color: Colors.statusCancelled,  bg: '#F5F5F5', icon: 'close-circle-outline' },
};

const TABS = [
  { label: 'Barchasi', value: undefined },
  { label: 'Yangi',     value: 'PENDING' },
  { label: 'Qabul',     value: 'ACCEPTED' },
  { label: 'Tayyor',    value: 'READY' },
  { label: "Yetkazildi", value: 'DELIVERED' },
];

function fmt(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}.${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

export default function SellerOrdersScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['store-orders', activeTab],
    queryFn: () => ordersApi.getStoreOrders(activeTab),
  });

  const orders = Array.isArray(data) ? data : [];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Buyurtmalar</Text>
        <Text style={s.subtitle}>{orders.length} ta buyurtma</Text>
        <FlatList
          data={TABS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={i => String(i.value ?? 'all')}
          contentContainerStyle={s.chips}
          renderItem={({ item }) => {
            const active = activeTab === item.value;
            return (
              <TouchableOpacity
                style={[s.chip, active && s.chipActive]}
                onPress={() => setActiveTab(item.value)}
              >
                <Text style={[s.chipTxt, active && s.chipTxtActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <FlatList
        data={orders}
        keyExtractor={i => i.id}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.primary} colors={[Colors.primary]} />}
        ListEmptyComponent={
          !isLoading ? (
            <View style={s.empty}>
              <View style={s.emptyIcon}><Ionicons name="cube-outline" size={40} color={Colors.primaryLight} /></View>
              <Text style={s.emptyTitle}>Buyurtma yo'q</Text>
              <Text style={s.emptySub}>{activeTab ? 'Bu holatda buyurtma topilmadi' : 'Hali birorta buyurtma kelmagan'}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const cfg = STATUS_CFG[item.status] ?? STATUS_CFG.PENDING;
          const isBroadcast = item.order_type === 'BROADCAST';
          return (
            <TouchableOpacity
              style={s.card}
              onPress={() => router.push({ pathname: '/(seller)/order/[id]', params: { id: item.id } })}
              activeOpacity={0.88}
            >
              <View style={s.cardTop}>
                <View style={s.orderTypeRow}>
                  <View style={[s.typeIcon, { backgroundColor: isBroadcast ? '#FFF3E0' : Colors.primarySurface }]}>
                    <Ionicons
                      name={isBroadcast ? 'megaphone-outline' : 'storefront-outline'}
                      size={16}
                      color={isBroadcast ? '#FF9800' : Colors.primary}
                    />
                  </View>
                  <View>
                    <Text style={s.orderNum}>{item.order_number}</Text>
                    <Text style={s.customerName}>
                      {item.customer?.first_name} {item.customer?.last_name}
                    </Text>
                  </View>
                </View>
                <View style={[s.statusPill, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={cfg.icon} size={12} color={cfg.color} />
                  <Text style={[s.statusTxt, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>
              <View style={s.divider} />
              <View style={s.cardBottom}>
                <View style={s.metaItem}>
                  <Ionicons name="layers-outline" size={13} color={Colors.textHint} />
                  <Text style={s.metaTxt}>{item.items?.length ?? 0} ta</Text>
                </View>
                <View style={s.metaItem}>
                  <Ionicons name="time-outline" size={13} color={Colors.textHint} />
                  <Text style={s.metaTxt}>{fmt(item.created_at ?? item.createdAt)}</Text>
                </View>
                <Text style={s.price}>{Number(item.total_price).toLocaleString()} so'm</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'android' ? Spacing.xs : 0,
    paddingBottom: Spacing.sm,
    gap: 3,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: { fontSize: 22, fontWeight: '800', color: Colors.white },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  chips: { gap: Spacing.xs, paddingBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: 'rgba(255,255,255,0.18)' },
  chipActive: { backgroundColor: Colors.white },
  chipTxt: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  chipTxtActive: { color: Colors.primary },

  list: { padding: Spacing.md, gap: Spacing.sm },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, ...Shadow.sm, gap: Spacing.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderTypeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  typeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  orderNum: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  customerName: { fontSize: 12, color: Colors.textHint, marginTop: 1 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  statusTxt: { fontSize: 11, fontWeight: '700' },
  divider: { height: 1, backgroundColor: Colors.divider },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt: { fontSize: 12, color: Colors.textHint },
  price: { marginLeft: 'auto', fontSize: 15, fontWeight: '800', color: Colors.primary },

  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: Colors.primarySurface, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: 13, color: Colors.textHint, textAlign: 'center', paddingHorizontal: 40 },
});
