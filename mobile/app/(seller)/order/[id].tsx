import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../../src/theme';
import { StatusBadge } from '../../../src/components/ui/Badge';
import { ordersApi } from '../../../src/api/orders';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Yangi',
  ACCEPTED: 'Qabul qilindi',
  READY: 'Tayyor',
  DELIVERING: 'Yetkazmoqda',
  DELIVERED: 'Yetkazildi',
  CANCELLED: 'Bekor',
};

export default function SellerOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getById(id),
  });

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  };

  const selectAll = () => {
    if (!order?.items) return;
    setSelectedItems(new Set(order.items.map((i: any) => i.id)));
  };

  const handleAcceptAll = async () => {
    setLoading(true);
    try {
      await ordersApi.acceptOrder(id);
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['store-orders'] });
      Alert.alert('Qabul qilindi', 'Buyurtma muvaffaqiyatli qabul qilindi');
    } catch (err: any) {
      Alert.alert('Xato', err?.response?.data?.message ?? 'Xato yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSelected = async () => {
    if (selectedItems.size === 0) { Alert.alert('Xato', 'Kamida bitta mahsulot tanlang'); return; }
    setLoading(true);
    try {
      const result = await ordersApi.acceptOrderItems(id, Array.from(selectedItems));
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['store-orders'] });
      if (result.has_rejected_items) {
        Alert.alert('Qisman qabul', `${result.rejected_items?.length} ta mahsulot qabul qilinmadi. Mijozga xabar yuborildi.`);
      } else {
        Alert.alert('Qabul qilindi', 'Barcha tanlangan mahsulotlar qabul qilindi');
      }
    } catch (err: any) {
      Alert.alert('Xato', err?.response?.data?.message ?? 'Xato yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleReady = async () => {
    setLoading(true);
    try {
      await ordersApi.readyOrder(id);
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      Alert.alert('Barakalla!', 'Buyurtma tayyor deb belgilandi');
    } catch (err: any) {
      Alert.alert('Xato', err?.response?.data?.message ?? 'Xato yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return <SafeAreaView style={s.safe}><ActivityIndicator style={{ flex: 1 }} color={Colors.primary} /></SafeAreaView>;
  }
  if (!order) return null;

  const isPending = order.status === 'PENDING';
  const isAccepted = order.status === 'ACCEPTED';
  const isBroadcast = order.order_type === 'BROADCAST';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{order.order_number}</Text>
          <Text style={s.headerSub}>{STATUS_LABEL[order.status] ?? order.status}</Text>
        </View>
        <StatusBadge status={order.status} />
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.xl }}>

        {/* Customer & type */}
        <View style={s.card}>
          <View style={s.infoRow}>
            <View style={[s.infoIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="person-outline" size={18} color="#2196F3" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.infoLabel}>Mijoz</Text>
              <Text style={s.infoVal}>{order.customer?.first_name} {order.customer?.last_name}</Text>
            </View>
            <View style={[s.typePill, { backgroundColor: isBroadcast ? '#FFF3E0' : Colors.primarySurface }]}>
              <Ionicons name={isBroadcast ? 'megaphone-outline' : 'storefront-outline'} size={12} color={isBroadcast ? '#FF9800' : Colors.primary} />
              <Text style={[s.typeTxt, { color: isBroadcast ? '#FF9800' : Colors.primary }]}>
                {isBroadcast ? 'Umumiy' : "To'g'ridan"}
              </Text>
            </View>
          </View>
        </View>

        {/* Items */}
        <View style={s.card}>
          <View style={s.cardHeaderRow}>
            <View style={[s.infoIcon, { backgroundColor: Colors.primarySurface }]}>
              <Ionicons name="cube-outline" size={18} color={Colors.primary} />
            </View>
            <Text style={s.cardSectionTitle}>Mahsulotlar ({order.items?.length ?? 0} ta)</Text>
            {isPending && (
              <TouchableOpacity onPress={selectAll} style={s.selectAllBtn}>
                <Text style={s.selectAllTxt}>Barchasini</Text>
              </TouchableOpacity>
            )}
          </View>

          {order.items?.map((item: any) => (
            <TouchableOpacity
              key={item.id}
              style={[s.itemRow, isPending && selectedItems.has(item.id) && s.itemSelected]}
              onPress={() => isPending && toggleItem(item.id)}
              activeOpacity={isPending ? 0.7 : 1}
            >
              {isPending && (
                <View style={[s.checkbox, selectedItems.has(item.id) && s.checkboxChecked]}>
                  {selectedItems.has(item.id) && <Ionicons name="checkmark" size={12} color={Colors.white} />}
                </View>
              )}
              <View style={s.itemInfo}>
                <Text style={s.itemName}>{item.product_name}</Text>
                <Text style={s.itemQty}>{item.quantity} ta × {Number(item.price).toLocaleString()} so'm</Text>
              </View>
              <Text style={s.itemTotal}>{Number(item.total_price).toLocaleString()} so'm</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Payment */}
        <View style={s.card}>
          <View style={s.payRow}>
            <View>
              <Text style={s.infoLabel}>Jami to'lov</Text>
              <Text style={s.payPrice}>{Number(order.total_price).toLocaleString()} so'm</Text>
            </View>
            <View style={s.payMethodPill}>
              <Ionicons name={order.payment_method === 'CASH' ? 'cash-outline' : 'card-outline'} size={14} color={Colors.success} />
              <Text style={s.payMethodTxt}>{order.payment_method === 'CASH' ? 'Naqd' : 'Karta'}</Text>
            </View>
          </View>
        </View>

        {/* Address */}
        <View style={s.card}>
          <View style={s.infoRow}>
            <View style={[s.infoIcon, { backgroundColor: Colors.primarySurface }]}>
              <Ionicons name="location-outline" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.infoLabel}>Yetkazib berish manzili</Text>
              <Text style={s.infoVal}>{order.delivery_address}</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        {isPending && (
          <View style={s.actions}>
            <TouchableOpacity style={s.acceptBtn} onPress={handleAcceptAll} disabled={loading} activeOpacity={0.85}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              <Text style={s.acceptBtnTxt}>Hammasini qabul qilish</Text>
            </TouchableOpacity>
            {selectedItems.size > 0 && selectedItems.size < (order.items?.length ?? 0) && (
              <TouchableOpacity style={s.partialBtn} onPress={handleAcceptSelected} disabled={loading} activeOpacity={0.85}>
                <Ionicons name="checkmark" size={20} color={Colors.primary} />
                <Text style={s.partialBtnTxt}>Faqat tanlanganlar ({selectedItems.size})</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={() => Alert.alert('Rad etish', 'Sababini kiriting', [
                { text: 'Bekor qilish', style: 'cancel' },
                { text: 'Rad et', style: 'destructive', onPress: async () => {
                  await ordersApi.cancelOrder(id, 'Sotuvchi tomonidan rad etildi');
                  queryClient.invalidateQueries({ queryKey: ['order', id] });
                  router.back();
                }},
              ])}
              activeOpacity={0.85}
            >
              <Ionicons name="close-circle-outline" size={20} color={Colors.error} />
              <Text style={s.cancelBtnTxt}>Rad etish</Text>
            </TouchableOpacity>
          </View>
        )}

        {isAccepted && (
          <View style={s.actions}>
            <TouchableOpacity style={s.readyBtn} onPress={handleReady} disabled={loading} activeOpacity={0.85}>
              <Ionicons name="cube" size={20} color={Colors.white} />
              <Text style={s.acceptBtnTxt}>Tayyor deb belgilash</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    paddingTop: Platform.OS === 'android' ? Spacing.sm : Spacing.md,
    gap: Spacing.sm,
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.white },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 1 },

  scroll: { flex: 1 },
  card: { backgroundColor: Colors.white, marginHorizontal: Spacing.md, marginTop: Spacing.sm, borderRadius: Radius.lg, padding: Spacing.md, ...Shadow.sm, gap: Spacing.sm },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardSectionTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  selectAllBtn: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: Colors.primarySurface, borderRadius: Radius.full },
  selectAllTxt: { fontSize: 11, fontWeight: '600', color: Colors.primary },

  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  infoIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  infoLabel: { fontSize: 11, fontWeight: '600', color: Colors.textHint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  infoVal: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  typePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full },
  typeTxt: { fontSize: 11, fontWeight: '600' },

  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.divider, gap: Spacing.sm },
  itemSelected: { backgroundColor: Colors.primarySurface, borderRadius: Radius.sm },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
  itemQty: { fontSize: 12, color: Colors.textHint, marginTop: 2 },
  itemTotal: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  payPrice: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  payMethodPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full },
  payMethodTxt: { fontSize: 13, fontWeight: '600', color: Colors.success },

  actions: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, gap: Spacing.sm },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.success, borderRadius: Radius.lg, height: 52, ...Shadow.sm },
  readyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: Radius.lg, height: 52, ...Shadow.sm },
  acceptBtnTxt: { fontSize: 16, fontWeight: '700', color: Colors.white },
  partialBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.white, borderRadius: Radius.lg, height: 50, borderWidth: 2, borderColor: Colors.primary },
  partialBtnTxt: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.errorSurface, borderRadius: Radius.lg, height: 50 },
  cancelBtnTxt: { fontSize: 15, fontWeight: '600', color: Colors.error },
});
