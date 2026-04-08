import React from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../../src/theme';
import { ordersApi } from '../../../src/api/orders';
import { useSocket } from '../../../src/hooks/useSocket';

export default function BroadcastRequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: request, isLoading } = useQuery({
    queryKey: ['broadcast-request', id],
    queryFn: () => ordersApi.getBroadcastRequestById(id),
  });

  const { data: offers } = useQuery({
    queryKey: ['broadcast-offers', id],
    queryFn: () => ordersApi.getBroadcastOffers(id),
    enabled: request?.status === 'OPEN',
    refetchInterval: request?.status === 'OPEN' ? 10000 : false,
  });

  useSocket('customer', (event, data) => {
    if (event === 'broadcast:offer_updated' && data?.requestId === id) {
      queryClient.invalidateQueries({ queryKey: ['broadcast-offers', id] });
      queryClient.invalidateQueries({ queryKey: ['broadcast-request', id] });
    }
  });

  const handleSelectOffer = async (offerId: string, isFullOffer: boolean) => {
    if (!isFullOffer) {
      Alert.alert(
        'Qisman yetkazib berish',
        "Bu do'kon barcha mahsulotni emas, bir qismini yetkazib beradi. Qolgan mahsulotlar uchun yangi buyurtma yaratiladimi?",
        [
          { text: 'Bekor qilish', style: 'cancel' },
          { text: 'Ha, davom etish', onPress: () => confirmSelect(offerId) },
        ],
      );
    } else {
      confirmSelect(offerId);
    }
  };

  const confirmSelect = async (offerId: string) => {
    try {
      const result = await ordersApi.selectBroadcastOffer(id, offerId);
      queryClient.invalidateQueries({ queryKey: ['broadcast-request', id] });
      Alert.alert('Muvaffaqiyat!', 'Buyurtma qabul qilindi', [
        { text: "Buyurtmani ko'rish", onPress: () => router.replace({ pathname: '/(customer)/order/[id]', params: { id: result.id } }) },
      ]);
    } catch (err: any) {
      Alert.alert('Xato', err?.response?.data?.message ?? 'Xato yuz berdi');
    }
  };

  if (isLoading) {
    return <SafeAreaView style={s.safe}><ActivityIndicator style={{ flex: 1 }} color={Colors.primary} /></SafeAreaView>;
  }

  const isOpen = request?.status === 'OPEN';
  const offerList = Array.isArray(offers) ? offers : [];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Buyurtma holati</Text>
          <Text style={s.headerSub}>{offerList.length} ta taklif keldi</Text>
        </View>
        <View style={[s.statusPill, { backgroundColor: isOpen ? '#C8E6C9' : '#FFCDD2' }]}>
          <View style={[s.statusDot, { backgroundColor: isOpen ? Colors.success : Colors.error }]} />
          <Text style={[s.statusTxt, { color: isOpen ? Colors.success : Colors.error }]}>
            {isOpen ? 'Ochiq' : 'Yopiq'}
          </Text>
        </View>
      </View>

      <FlatList
        data={offerList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <View>
            {/* Requested items summary */}
            <View style={s.card}>
              <View style={s.cardHeaderRow}>
                <View style={[s.iconBox, { backgroundColor: Colors.primarySurface }]}>
                  <Ionicons name="megaphone-outline" size={18} color={Colors.primary} />
                </View>
                <Text style={s.cardTitle}>Buyurtma qilingan mahsulotlar</Text>
              </View>
              {request?.items?.map((item: any) => (
                <View key={item.id} style={s.reqItemRow}>
                  <View style={s.reqItemDot} />
                  <Text style={s.reqItemTxt} numberOfLines={1}>{item.product_name}</Text>
                  <Text style={s.reqItemQty}>× {item.quantity}</Text>
                </View>
              ))}
            </View>

            {/* Waiting state */}
            {offerList.length === 0 && isOpen && (
              <View style={s.waitingCard}>
                <View style={s.waitingIconBox}>
                  <Ionicons name="hourglass-outline" size={36} color={Colors.primary} />
                </View>
                <Text style={s.waitingTitle}>Takliflar kutilmoqda...</Text>
                <Text style={s.waitingSub}>Yaqin do'konlar sizning buyurtmangizni ko'rib chiqmoqda</Text>
              </View>
            )}

            {offerList.length > 0 && (
              <Text style={s.offersHeading}>Takliflar ({offerList.length})</Text>
            )}
          </View>
        }
        renderItem={({ item: offer }) => {
          const reqCount = request?.items?.length ?? 0;
          const offerCount = offer.items?.length ?? 0;
          const isFull = offerCount >= reqCount;
          return (
            <View style={[s.offerCard, !isFull && s.offerCardPartial]}>
              {/* Store */}
              <View style={s.offerTop}>
                <View style={[s.iconBox, { backgroundColor: Colors.primarySurface }]}>
                  <Ionicons name="storefront-outline" size={18} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.storeName}>{offer.store?.name}</Text>
                  {offer.store?.is_prime && (
                    <View style={s.premiumBadge}>
                      <Ionicons name="star" size={10} color="#F57F17" />
                      <Text style={s.premiumTxt}>Premium</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Partial warning */}
              {!isFull && (
                <View style={s.warnRow}>
                  <Ionicons name="warning-outline" size={14} color={Colors.warning} />
                  <Text style={s.warnTxt}>
                    Bu do'kon {offerCount}/{reqCount} ta mahsulotni yetkazib bera oladi
                  </Text>
                </View>
              )}

              {/* Items */}
              <View style={s.divider} />
              {offer.items?.map((item: any) => (
                <View key={item.id} style={s.offerItemRow}>
                  <Text style={s.offerItemName} numberOfLines={1}>{item.product_name}</Text>
                  <Text style={s.offerItemPrice}>{Number(item.unit_price).toLocaleString()} so'm</Text>
                </View>
              ))}
              <View style={s.divider} />

              {/* Meta */}
              <View style={s.offerMeta}>
                <View style={s.metaItem}>
                  <Ionicons name="car-outline" size={14} color={Colors.textHint} />
                  <Text style={s.metaTxt}>
                    {offer.delivery_price > 0 ? `${Number(offer.delivery_price).toLocaleString()} so'm` : 'Bepul'}
                  </Text>
                </View>
                <View style={s.metaItem}>
                  <Ionicons name="time-outline" size={14} color={Colors.textHint} />
                  <Text style={s.metaTxt}>~{offer.estimated_minutes} daqiqa</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={s.totalLabel}>Jami</Text>
                  <Text style={s.totalPrice}>{Number(offer.total_price).toLocaleString()} so'm</Text>
                </View>
              </View>

              {offer.message && (
                <View style={s.messageBox}>
                  <Ionicons name="chatbubble-outline" size={13} color={Colors.textHint} />
                  <Text style={s.messageTxt} numberOfLines={2}>"{offer.message}"</Text>
                </View>
              )}

              <TouchableOpacity style={s.selectBtn} onPress={() => handleSelectOffer(offer.id, isFull)} activeOpacity={0.85}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
                <Text style={s.selectBtnTxt}>Bu taklifni qabul qilish</Text>
              </TouchableOpacity>
            </View>
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
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    paddingTop: Platform.OS === 'android' ? Spacing.sm : Spacing.md,
    gap: Spacing.sm,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.white },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontSize: 11, fontWeight: '700' },

  list: { padding: Spacing.md, gap: Spacing.sm },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, ...Shadow.sm, gap: Spacing.sm },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  reqItemRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 44 },
  reqItemDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.border },
  reqItemTxt: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  reqItemQty: { fontSize: 12, fontWeight: '600', color: Colors.textHint },

  waitingCard: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm, marginVertical: Spacing.sm },
  waitingIconBox: { width: 80, height: 80, borderRadius: 24, backgroundColor: Colors.primarySurface, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  waitingTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  waitingSub: { fontSize: 13, color: Colors.textHint, textAlign: 'center', lineHeight: 19 },

  offersHeading: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginTop: Spacing.xs, marginBottom: -Spacing.xs / 2 },

  offerCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, ...Shadow.sm, gap: Spacing.sm },
  offerCardPartial: { borderLeftWidth: 3, borderLeftColor: Colors.warning },
  offerTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  storeName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  premiumBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  premiumTxt: { fontSize: 10, fontWeight: '700', color: '#F57F17' },
  warnRow: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.warningSurface, padding: Spacing.sm, borderRadius: Radius.sm },
  warnTxt: { fontSize: 12, color: Colors.warning, fontWeight: '500', flex: 1 },
  divider: { height: 1, backgroundColor: Colors.divider },
  offerItemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  offerItemName: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  offerItemPrice: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  offerMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt: { fontSize: 12, color: Colors.textHint },
  totalLabel: { fontSize: 11, color: Colors.textHint, fontWeight: '600' },
  totalPrice: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  messageBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: Colors.background, padding: Spacing.sm, borderRadius: Radius.sm },
  messageTxt: { fontSize: 12, color: Colors.textSecondary, fontStyle: 'italic', flex: 1 },
  selectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: Colors.primary, borderRadius: Radius.lg, height: 48, ...Shadow.sm },
  selectBtnTxt: { fontSize: 15, fontWeight: '700', color: Colors.white },
});
