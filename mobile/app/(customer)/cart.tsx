import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { useCartStore } from '../../src/store/cart.store';
import { useLocationStore } from '../../src/store/location.store';
import { ordersApi } from '../../src/api/orders';

type Tab = 'direct' | 'broadcast';

export default function CartScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('direct');
  const [loading, setLoading] = useState(false);
  const { lat, lng, address } = useLocationStore();

  const {
    directItems, directStoreName, broadcastItems,
    removeDirectItem, updateDirectQuantity, clearDirectCart,
    removeBroadcastItem, updateBroadcastQuantity,
  } = useCartStore();

  const directTotal = directItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const broadcastCount = broadcastItems.reduce((s, i) => s + i.quantity, 0);

  const handleOrder = async () => {
    if (!directItems.length) return;
    if (!lat || !lng) {
      Alert.alert('Joylashuv kerak', 'Yetkazib berish uchun joylashuvingizni yoqing');
      return;
    }
    setLoading(true);
    try {
      const order = await ordersApi.create({
        order_type: 'DIRECT',
        store_id: directItems[0].store_id,
        items: directItems.map(i => ({ store_product_id: i.store_product_id, quantity: i.quantity })),
        delivery_lat: lat,
        delivery_lng: lng,
        delivery_address: address ?? 'Manzil kiritilmadi',
        payment_method: 'CASH',
      });
      clearDirectCart();
      router.push({ pathname: '/(customer)/order/[id]', params: { id: order.id } });
    } catch (e: any) {
      Alert.alert('Xato', e?.response?.data?.message ?? 'Xato yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.title}>Savatcha</Text>
        {/* Tab switcher */}
        <View style={s.switcher}>
          {(['direct', 'broadcast'] as Tab[]).map(tab => {
            const active = activeTab === tab;
            const count = tab === 'direct' ? directItems.length : broadcastItems.length;
            return (
              <TouchableOpacity
                key={tab}
                style={[s.switchBtn, active && s.switchBtnActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Ionicons
                  name={tab === 'direct' ? 'storefront-outline' : 'megaphone-outline'}
                  size={14}
                  color={active ? Colors.primary : 'rgba(255,255,255,0.7)'}
                />
                <Text style={[s.switchTxt, active && s.switchTxtActive]}>
                  {tab === 'direct' ? "Do'kon" : 'Umumiy'}
                </Text>
                {count > 0 && (
                  <View style={[s.switchBadge, active && s.switchBadgeActive]}>
                    <Text style={[s.switchBadgeTxt, active && { color: Colors.primary }]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {activeTab === 'direct' ? (
        directItems.length === 0 ? (
          <EmptyCart
            icon="storefront-outline"
            title="Savatcha bo'sh"
            sub="Do'kondan mahsulot qo'shing"
            onBrowse={() => router.push('/(customer)/home')}
          />
        ) : (
          <>
            <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
              {/* Store label */}
              <View style={s.storeRow}>
                <View style={s.storeIconBox}>
                  <Ionicons name="storefront" size={16} color={Colors.primary} />
                </View>
                <Text style={s.storeName}>{directStoreName ?? "Do'kon"}</Text>
                <TouchableOpacity onPress={() => Alert.alert('Tozalash', 'Savatchani tozalaysizmi?', [
                  { text: 'Bekor', style: 'cancel' },
                  { text: 'Tozalash', style: 'destructive', onPress: clearDirectCart },
                ])}>
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                </TouchableOpacity>
              </View>

              {/* Items */}
              {directItems.map((item, idx) => (
                <View key={item.store_product_id} style={[s.itemCard, idx > 0 && { marginTop: Spacing.sm }]}>
                  <View style={s.itemImg}>
                    <Ionicons name="cube-outline" size={22} color={Colors.primaryLight} />
                  </View>
                  <View style={s.itemInfo}>
                    <Text style={s.itemName} numberOfLines={2}>{item.product_name}</Text>
                    <Text style={s.itemPrice}>{Number(item.price).toLocaleString()} so'm</Text>
                  </View>
                  <View style={s.qtyRow}>
                    <TouchableOpacity
                      style={s.qtyBtn}
                      onPress={() => item.quantity <= 1
                        ? removeDirectItem(item.store_product_id)
                        : updateDirectQuantity(item.store_product_id, item.quantity - 1)}
                    >
                      <Ionicons
                        name={item.quantity <= 1 ? 'trash-outline' : 'remove'}
                        size={15}
                        color={item.quantity <= 1 ? Colors.error : Colors.primary}
                      />
                    </TouchableOpacity>
                    <Text style={s.qty}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={[s.qtyBtn, s.qtyBtnAdd]}
                      onPress={() => updateDirectQuantity(item.store_product_id, item.quantity + 1)}
                    >
                      <Ionicons name="add" size={15} color={Colors.white} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* Summary */}
              <View style={s.summaryCard}>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Mahsulotlar ({directItems.length} ta)</Text>
                  <Text style={s.summaryValue}>{directTotal.toLocaleString()} so'm</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Yetkazib berish</Text>
                  <Text style={[s.summaryValue, { color: Colors.success }]}>Bepul</Text>
                </View>
                <View style={s.divider} />
                <View style={s.summaryRow}>
                  <Text style={s.totalLabel}>Jami to'lov</Text>
                  <Text style={s.totalValue}>{directTotal.toLocaleString()} so'm</Text>
                </View>
              </View>

              {/* Delivery address */}
              <View style={s.addressCard}>
                <Ionicons name="location" size={18} color={Colors.primary} />
                <Text style={s.addressTxt} numberOfLines={1}>
                  {address ?? 'Joylashuvni aniqlash...'}
                </Text>
              </View>
              <View style={{ height: 100 }} />
            </ScrollView>

            {/* Sticky checkout */}
            <View style={s.checkoutBar}>
              <View>
                <Text style={s.checkoutSub}>Jami</Text>
                <Text style={s.checkoutTotal}>{directTotal.toLocaleString()} so'm</Text>
              </View>
              <TouchableOpacity
                style={[s.checkoutBtn, loading && { opacity: 0.7 }]}
                onPress={handleOrder}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
                <Text style={s.checkoutTxt}>{loading ? 'Yuklanmoqda...' : 'Buyurtma berish'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )
      ) : (
        broadcastItems.length === 0 ? (
          <EmptyCart
            icon="megaphone-outline"
            title="Umumiy savat bo'sh"
            sub="Qidirish orqali mahsulot qo'shing"
            onBrowse={() => router.push('/(customer)/search')}
          />
        ) : (
          <>
            <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
              <View style={s.broadcastBanner}>
                <Ionicons name="megaphone" size={20} color={Colors.white} />
                <Text style={s.broadcastBannerTxt}>
                  Bu mahsulotlar barcha yaqin do'konlarga yuboriladi
                </Text>
              </View>
              {broadcastItems.map((item, idx) => (
                <View key={item.product_id} style={[s.itemCard, idx > 0 && { marginTop: Spacing.sm }]}>
                  <View style={s.itemImg}>
                    <Ionicons name="cube-outline" size={22} color={Colors.primaryLight} />
                  </View>
                  <View style={s.itemInfo}>
                    <Text style={s.itemName} numberOfLines={2}>
                      {typeof item.product_name === 'object'
                        ? (item.product_name as any).uz ?? JSON.stringify(item.product_name)
                        : item.product_name}
                    </Text>
                    <Text style={s.itemPrice}>{item.quantity} dona</Text>
                  </View>
                  <View style={s.qtyRow}>
                    <TouchableOpacity
                      style={s.qtyBtn}
                      onPress={() => item.quantity <= 1
                        ? removeBroadcastItem(item.product_id)
                        : updateBroadcastQuantity(item.product_id, item.quantity - 1)}
                    >
                      <Ionicons name={item.quantity <= 1 ? 'trash-outline' : 'remove'} size={15} color={item.quantity <= 1 ? Colors.error : Colors.primary} />
                    </TouchableOpacity>
                    <Text style={s.qty}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={[s.qtyBtn, s.qtyBtnAdd]}
                      onPress={() => updateBroadcastQuantity(item.product_id, item.quantity + 1)}
                    >
                      <Ionicons name="add" size={15} color={Colors.white} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              <View style={{ height: 100 }} />
            </ScrollView>
            <View style={s.checkoutBar}>
              <View>
                <Text style={s.checkoutSub}>{broadcastCount} ta mahsulot</Text>
                <Text style={s.checkoutTotal}>Umumiy buyurtma</Text>
              </View>
              <TouchableOpacity
                style={s.checkoutBtn}
                onPress={() => router.push('/(customer)/broadcast-cart')}
                activeOpacity={0.85}
              >
                <Ionicons name="megaphone" size={18} color={Colors.white} />
                <Text style={s.checkoutTxt}>Yuborish</Text>
              </TouchableOpacity>
            </View>
          </>
        )
      )}
    </SafeAreaView>
  );
}

function EmptyCart({ icon, title, sub, onBrowse }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string; sub: string; onBrowse: () => void;
}) {
  return (
    <View style={empty.wrap}>
      <View style={empty.iconBox}>
        <Ionicons name={icon} size={48} color={Colors.primaryLight} />
      </View>
      <Text style={empty.title}>{title}</Text>
      <Text style={empty.sub}>{sub}</Text>
      <TouchableOpacity style={empty.btn} onPress={onBrowse}>
        <Text style={empty.btnTxt}>Xarid qilish</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'android' ? Spacing.xs : 0,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: { fontSize: 22, fontWeight: '800', color: Colors.white },
  switcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.lg,
    padding: 3,
    gap: 3,
  },
  switchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  switchBtnActive: { backgroundColor: Colors.white, ...Shadow.sm },
  switchTxt: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  switchTxtActive: { color: Colors.primary },
  switchBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: Radius.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  switchBadgeActive: { backgroundColor: Colors.primarySurface },
  switchBadgeTxt: { fontSize: 10, fontWeight: '700', color: Colors.white },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md },

  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    paddingHorizontal: 4,
  },
  storeIconBox: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  storeName: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.textPrimary },

  itemCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  itemImg: {
    width: 48, height: 48, borderRadius: Radius.md,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary, lineHeight: 18 },
  itemPrice: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginTop: 3 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  qtyBtn: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnAdd: { backgroundColor: Colors.primary },
  qty: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, minWidth: 20, textAlign: 'center' },

  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
    gap: 10,
    ...Shadow.sm,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14, color: Colors.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  divider: { height: 1, backgroundColor: Colors.divider },
  totalLabel: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  totalValue: { fontSize: 18, fontWeight: '800', color: Colors.primary },

  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primarySurface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  addressTxt: { flex: 1, fontSize: 13, color: Colors.primary, fontWeight: '500' },

  checkoutBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 28 : Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadow.lg,
  },
  checkoutSub: { fontSize: 12, color: Colors.textHint },
  checkoutTotal: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 13,
    borderRadius: Radius.lg,
    ...Shadow.sm,
  },
  checkoutTxt: { fontSize: 15, fontWeight: '700', color: Colors.white },

  broadcastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  broadcastBannerTxt: { flex: 1, fontSize: 13, color: Colors.white, lineHeight: 18 },
});

const empty = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  iconBox: {
    width: 96, height: 96, borderRadius: 28,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  sub: { fontSize: 14, color: Colors.textHint, textAlign: 'center' },
  btn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    marginTop: Spacing.sm,
  },
  btnTxt: { fontSize: 15, fontWeight: '700', color: Colors.white },
});
