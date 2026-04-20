import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Platform,
  Alert, Modal, Pressable, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../../src/theme';
import { StatusBadge } from '../../../src/components/ui/Badge';
import { ordersApi } from '../../../src/api/orders';
import { useSocket } from '../../../src/hooks/useSocket';
import { haptics } from '../../../src/utils/haptics';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Kutilmoqda',
  ACCEPTED: 'Qabul qilindi',
  READY: 'Tayyor',
  DELIVERING: 'Yetkazmoqda',
  DELIVERED: 'Yetkazildi',
  CANCELLED: 'Bekor qilindi',
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [courierLocation, setCourierLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [claimedAmount, setClaimedAmount] = useState('');
  const [changeLoading, setChangeLoading] = useState<'CONFIRM' | 'WAIVE' | 'DISPUTE' | null>(null);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getById(id),
    refetchInterval: (query) =>
      query.state.data?.status === 'DELIVERING' ? 15000 : false,
  });

  const { subscribeToOrder } = useSocket('customer', (event, data) => {
    if (data?.order_id === id) {
      if (event === 'order:status-changed') {
        queryClient.invalidateQueries({ queryKey: ['order', id] });
        queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      }
      if (event === 'courier:location-changed') {
        setCourierLocation({ lat: data.lat, lng: data.lng });
      }
    }
  });

  useEffect(() => {
    if (id) subscribeToOrder(id);
  }, [id]);

  if (isLoading) {
    return <SafeAreaView style={s.safe}><ActivityIndicator style={{ flex: 1 }} color={Colors.primary} /></SafeAreaView>;
  }
  if (!order) return null;

  const deliveryLat = Number(order.delivery_lat);
  const deliveryLng = Number(order.delivery_lng);
  const showMap = order.status === 'DELIVERING' && !!courierLocation;

  const changeStatus = order.change_status;
  const changeAmount = Number(order.change_amount ?? 0);
  const paidAmount = Number(order.paid_amount ?? 0);
  const showChangeBanner = changeStatus === 'PENDING' && changeAmount > 0;

  const handleChangeAction = async (
    action: 'CONFIRM' | 'WAIVE' | 'DISPUTE',
    claimed?: number,
  ) => {
    setChangeLoading(action);
    haptics.medium();
    try {
      await ordersApi.confirmChange(id, {
        action,
        claimed_amount: claimed,
      });
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      setDisputeOpen(false);
      setClaimedAmount('');
    } catch (e: any) {
      haptics.error();
      Alert.alert('Xato', e?.response?.data?.message ?? 'Xato');
    } finally {
      setChangeLoading(null);
    }
  };

  const submitDispute = () => {
    const claimed = Number(claimedAmount.replace(/\s/g, ''));
    if (!claimedAmount || !Number.isFinite(claimed) || claimed < Number(order.total_price)) {
      haptics.warning();
      Alert.alert('Xato', `Summa buyurtma narxidan (${Number(order.total_price).toLocaleString()} so'm) kam bo'lmasligi kerak`);
      return;
    }
    handleChangeAction('DISPUTE', claimed);
  };

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

        {/* Courier map (only while delivering) */}
        {showMap && courierLocation && (
          <View style={s.mapWrap}>
            <MapView
              style={s.map}
              region={{
                latitude: (courierLocation.lat + deliveryLat) / 2,
                longitude: (courierLocation.lng + deliveryLng) / 2,
                latitudeDelta: Math.abs(courierLocation.lat - deliveryLat) * 2 + 0.01,
                longitudeDelta: Math.abs(courierLocation.lng - deliveryLng) * 2 + 0.01,
              }}
            >
              <Marker coordinate={{ latitude: courierLocation.lat, longitude: courierLocation.lng }} title="Kuryer">
                <View style={s.courierMarker}>
                  <Ionicons name="bicycle" size={16} color={Colors.white} />
                </View>
              </Marker>
              <Marker coordinate={{ latitude: deliveryLat, longitude: deliveryLng }} title="Manzil">
                <View style={s.destMarker}>
                  <Ionicons name="location" size={16} color={Colors.white} />
                </View>
              </Marker>
              <Polyline
                coordinates={[
                  { latitude: courierLocation.lat, longitude: courierLocation.lng },
                  { latitude: deliveryLat, longitude: deliveryLng },
                ]}
                strokeColor={Colors.primary}
                strokeWidth={3}
                lineDashPattern={[10, 5]}
              />
            </MapView>
            <View style={s.mapOverlay}>
              <Ionicons name="navigate" size={14} color={Colors.white} />
              <Text style={s.mapOverlayTxt}>Kuryer yo'lda kelmoqda...</Text>
            </View>
          </View>
        )}

        {/* Store */}
        <View style={s.card}>
          <View style={s.infoRow}>
            <View style={[s.infoIcon, { backgroundColor: Colors.primarySurface }]}>
              <Ionicons name="storefront-outline" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.infoLabel}>Do'kon</Text>
              <Text style={s.infoVal}>{order.store?.name}</Text>
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
          </View>
          {order.items?.map((item: any) => (
            <View key={item.id} style={s.itemRow}>
              <View style={s.itemLeft}>
                <Text style={s.itemName}>{item.product_name}</Text>
                <Text style={s.itemQty}>{item.quantity} × {Number(item.price).toLocaleString()} so'm</Text>
              </View>
              <Text style={s.itemTotal}>{Number(item.total_price).toLocaleString()} so'm</Text>
            </View>
          ))}
        </View>

        {/* Change banner — PENDING */}
        {showChangeBanner && (
          <View style={[s.card, s.changeCard]}>
            <View style={s.changeHeader}>
              <View style={[s.infoIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="cash-outline" size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.changeTitle}>Qaytim kutmoqda</Text>
                <Text style={s.changeSub}>
                  Siz {paidAmount.toLocaleString()} so'm to'ladingiz. {changeAmount.toLocaleString()} so'm qaytim sizni kutmoqda.
                </Text>
              </View>
            </View>

            <View style={s.changeBtnRow}>
              <TouchableOpacity
                style={[s.changeBtn, s.changeBtnConfirm, changeLoading === 'CONFIRM' && { opacity: 0.5 }]}
                onPress={() => handleChangeAction('CONFIRM')}
                disabled={changeLoading !== null}
                activeOpacity={0.85}
              >
                {changeLoading === 'CONFIRM' ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={14} color={Colors.white} />
                    <Text style={s.changeBtnTxt}>Tasdiqlayman</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.changeBtn, s.changeBtnWaive, changeLoading === 'WAIVE' && { opacity: 0.5 }]}
                onPress={() => {
                  Alert.alert(
                    'Kerak emas',
                    `${changeAmount.toLocaleString()} so'm sotuvchida qoladi. Tasdiqlaysizmi?`,
                    [
                      { text: 'Bekor', style: 'cancel' },
                      { text: 'Ha, kerak emas', onPress: () => handleChangeAction('WAIVE') },
                    ],
                  );
                }}
                disabled={changeLoading !== null}
                activeOpacity={0.85}
              >
                <Ionicons name="gift-outline" size={14} color={Colors.textSecondary} />
                <Text style={s.changeBtnTxtDark}>Kerak emas</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={s.disputeBtn}
              onPress={() => setDisputeOpen(true)}
              disabled={changeLoading !== null}
              activeOpacity={0.85}
            >
              <Ionicons name="alert-circle-outline" size={13} color={Colors.error} />
              <Text style={s.disputeBtnTxt}>Noto'g'ri miqdor kiritilgan</Text>
            </TouchableOpacity>

            <Text style={s.autoNote}>
              24 soat ichida javob bermasangiz avtomatik tasdiqlanadi
            </Text>
          </View>
        )}

        {/* Change — hal qilingan holat */}
        {['CONFIRMED', 'AUTO_CONFIRMED', 'WAIVED', 'RESOLVED_USER_WON', 'RESOLVED_SELLER_WON', 'RESOLVED_ADJUSTED'].includes(changeStatus) && (
          <View style={[s.card, s.changeResolvedCard]}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={s.resolvedTitle}>
                {changeStatus === 'WAIVED' ? 'Qaytim sotuvchida qoldirildi' :
                 changeStatus === 'RESOLVED_SELLER_WON' ? 'Nizo: sotuvchi haq topildi' :
                 changeStatus === 'RESOLVED_USER_WON' ? 'Nizo: siz haq topildingiz' :
                 changeStatus === 'RESOLVED_ADJUSTED' ? 'Nizo: qisman qaror' :
                 'Qaytim hisobingizga o\'tkazildi'}
              </Text>
              {changeAmount > 0 && changeStatus !== 'WAIVED' && (
                <Text style={s.resolvedSub}>{changeAmount.toLocaleString()} so'm</Text>
              )}
            </View>
          </View>
        )}

        {changeStatus === 'DISPUTED' && (
          <View style={[s.card, s.disputedCard]}>
            <Ionicons name="time-outline" size={18} color="#D97706" />
            <View style={{ flex: 1 }}>
              <Text style={s.disputedTitle}>Nizo admin tekshiruvida</Text>
              <Text style={s.disputedSub}>
                Kuryer: {paidAmount.toLocaleString()} so'm · Sizning: {Number(order.user_claimed_amount ?? 0).toLocaleString()} so'm
              </Text>
            </View>
          </View>
        )}

        {/* Summary */}
        <View style={s.card}>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Mahsulotlar</Text>
            <Text style={s.summaryVal}>{Number(order.items_price ?? 0).toLocaleString()} so'm</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Yetkazib berish</Text>
            <Text style={s.summaryVal}>{Number(order.delivery_price ?? 0).toLocaleString()} so'm</Text>
          </View>
          <View style={s.divider} />
          <View style={s.summaryRow}>
            <Text style={s.totalLabel}>Jami</Text>
            <Text style={s.totalVal}>{Number(order.total_price).toLocaleString()} so'm</Text>
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
              {order.delivery_details && <Text style={s.infoSub}>{order.delivery_details}</Text>}
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Dispute modal */}
      <Modal
        transparent
        visible={disputeOpen}
        animationType="fade"
        onRequestClose={() => setDisputeOpen(false)}
      >
        <Pressable style={s.modalBackdrop} onPress={() => setDisputeOpen(false)}>
          <Pressable style={s.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={s.modalTitle}>Haqiqiy miqdorni kiriting</Text>
            <Text style={s.modalSub}>
              Siz buyurtma uchun haqiqatan qancha to'laganingizni kiriting. Admin ko'rib chiqadi.
            </Text>

            <View style={s.modalInputWrap}>
              <TextInput
                style={s.modalInput}
                value={claimedAmount}
                onChangeText={(v) => setClaimedAmount(v.replace(/[^0-9]/g, ''))}
                placeholder="0"
                placeholderTextColor={Colors.textHint}
                keyboardType="number-pad"
                autoFocus
              />
              <Text style={s.modalCurrency}>so'm</Text>
            </View>

            <Text style={s.modalHint}>
              Buyurtma narxi: {Number(order.total_price).toLocaleString()} so'm
            </Text>

            <View style={s.modalBtnRow}>
              <TouchableOpacity
                style={[s.modalBtn, s.modalBtnCancel]}
                onPress={() => { setDisputeOpen(false); setClaimedAmount(''); }}
                activeOpacity={0.85}
              >
                <Text style={s.modalBtnCancelTxt}>Bekor</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, s.modalBtnDispute, changeLoading === 'DISPUTE' && { opacity: 0.5 }]}
                onPress={submitDispute}
                disabled={changeLoading !== null}
                activeOpacity={0.85}
              >
                {changeLoading === 'DISPUTE' ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={s.modalBtnDisputeTxt}>Yuborish</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
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

  scroll: { flex: 1, backgroundColor: Colors.background },
  card: { backgroundColor: Colors.white, marginHorizontal: Spacing.md, marginTop: Spacing.sm, borderRadius: Radius.lg, padding: Spacing.md, ...Shadow.sm, gap: Spacing.sm },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardSectionTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.textPrimary },

  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  infoIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  infoLabel: { fontSize: 11, fontWeight: '600', color: Colors.textHint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  infoVal: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  infoSub: { fontSize: 12, color: Colors.textHint, marginTop: 2 },

  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.divider },
  itemLeft: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
  itemQty: { fontSize: 12, color: Colors.textHint, marginTop: 2 },
  itemTotal: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  summaryLabel: { fontSize: 13, color: Colors.textSecondary },
  summaryVal: { fontSize: 13, color: Colors.textPrimary },
  divider: { height: 1, backgroundColor: Colors.divider, marginVertical: Spacing.xs },
  totalLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  totalVal: { fontSize: 17, fontWeight: '800', color: Colors.primary },

  mapWrap: { height: 220, marginHorizontal: Spacing.md, marginTop: Spacing.sm, borderRadius: Radius.lg, overflow: 'hidden', ...Shadow.md },
  map: { flex: 1 },
  courierMarker: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FF5722', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.white },
  destMarker: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.white },
  mapOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 6, padding: 9,
  },
  mapOverlayTxt: { color: Colors.white, fontSize: 13, fontWeight: '600' },

  // ── Change banner ──
  changeCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FCD34D',
  },
  changeHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.sm },
  changeTitle: { fontSize: 15, fontWeight: '800', color: '#92400E' },
  changeSub: { fontSize: 12, color: '#78350F', marginTop: 3, lineHeight: 17 },
  changeBtnRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.xs },
  changeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 42, borderRadius: Radius.md, gap: 6,
  },
  changeBtnConfirm: { backgroundColor: Colors.success },
  changeBtnWaive: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.divider },
  changeBtnTxt: { fontSize: 13, fontWeight: '700', color: Colors.white },
  changeBtnTxtDark: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },

  disputeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, marginTop: Spacing.sm, paddingVertical: 7,
  },
  disputeBtnTxt: { fontSize: 12, fontWeight: '600', color: Colors.error },
  autoNote: { fontSize: 10, color: '#78350F', textAlign: 'center', marginTop: 4 },

  changeResolvedCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1, borderColor: '#BBF7D0',
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
  },
  resolvedTitle: { fontSize: 13, fontWeight: '700', color: Colors.success },
  resolvedSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  disputedCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1, borderColor: '#FCD34D',
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
  },
  disputedTitle: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  disputedSub: { fontSize: 11, color: '#78350F', marginTop: 2 },

  // Dispute modal
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modalSheet: {
    width: '100%', backgroundColor: Colors.white,
    borderRadius: Radius.lg, padding: Spacing.md,
    gap: Spacing.sm,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  modalSub: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  modalInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.error,
    paddingHorizontal: Spacing.md, height: 54,
  },
  modalInput: { flex: 1, fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  modalCurrency: { fontSize: 13, color: Colors.textHint, fontWeight: '600' },
  modalHint: { fontSize: 11, color: Colors.textHint },
  modalBtnRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  modalBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    height: 46, borderRadius: Radius.md,
  },
  modalBtnCancel: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.divider },
  modalBtnCancelTxt: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  modalBtnDispute: { backgroundColor: Colors.error },
  modalBtnDisputeTxt: { fontSize: 14, fontWeight: '700', color: Colors.white },
});
