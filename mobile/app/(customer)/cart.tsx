import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, Platform, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueries } from '@tanstack/react-query';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { useCartStore, type StoreCart } from '../../src/store/cart.store';
import { useLocationStore } from '../../src/store/location.store';
import { ordersApi } from '../../src/api/orders';
import { storesApi } from '../../src/api/stores';
import { useTranslation } from '../../src/i18n';
import { useRequireAuth } from '../../src/hooks/useRequireAuth';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
function imageUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_URL}/${path}`;
}

type Tab = 'stores' | 'broadcast';

export default function CartScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('stores');
  const [orderingStoreId, setOrderingStoreId] = useState<string | null>(null);
  const { lat, lng, address } = useLocationStore();
  const requireAuth = useRequireAuth();
  const { lang, t, tr } = useTranslation();

  const {
    storeCarts, broadcastItems,
    removeStoreItem, updateStoreQuantity, clearStoreCart,
    removeBroadcastItem, updateBroadcastQuantity,
  } = useCartStore();

  const storeList = Object.values(storeCarts);
  const totalStoreItems = storeList.reduce(
    (sum, c) => sum + c.items.reduce((s, i) => s + i.quantity, 0),
    0,
  );
  const broadcastCount = broadcastItems.reduce((s, i) => s + i.quantity, 0);

  // Har bir do'kon uchun delivery quote
  const deliveryQueries = useQueries({
    queries: storeList.map((c) => ({
      queryKey: ['delivery-quote', c.store_id, lat, lng],
      queryFn: () => storesApi.getDeliveryQuote(c.store_id, lat!, lng!),
      enabled: lat != null && lng != null,
    })),
  });
  const deliveryByStore: Record<string, any> = {};
  storeList.forEach((c, i) => {
    deliveryByStore[c.store_id] = deliveryQueries[i]?.data;
  });

  const orderFromStore = async (cart: StoreCart) => {
    if (!requireAuth()) return;
    if (!lat || !lng) {
      Alert.alert(tr('cart_location_required'), tr('cart_location_msg'));
      return;
    }
    setOrderingStoreId(cart.store_id);
    try {
      const order = await ordersApi.create({
        order_type: 'DIRECT',
        store_id: cart.store_id,
        items: cart.items.map((i) => ({
          store_product_id: i.store_product_id,
          quantity: i.quantity,
        })),
        delivery_lat: lat,
        delivery_lng: lng,
        delivery_address: address ?? (lang === 'ru' ? 'Адрес не указан' : 'Manzil kiritilmadi'),
        payment_method: 'CASH',
      });
      clearStoreCart(cart.store_id);
      router.push({ pathname: '/(customer)/order/[id]', params: { id: order.id } });
    } catch (e: any) {
      Alert.alert(
        tr('error'),
        e?.response?.data?.message ?? (lang === 'ru' ? 'Произошла ошибка' : 'Xato yuz berdi'),
      );
    } finally {
      setOrderingStoreId(null);
    }
  };

  const confirmClearStore = (cart: StoreCart) => {
    Alert.alert(
      lang === 'ru' ? 'Очистить' : 'Tozalash',
      lang === 'ru'
        ? `«${cart.store_name}» корзину очистить?`
        : `«${cart.store_name}» savatchasini tozalaymizmi?`,
      [
        { text: tr('cancel'), style: 'cancel' },
        {
          text: lang === 'ru' ? 'Очистить' : 'Tozalash',
          style: 'destructive',
          onPress: () => clearStoreCart(cart.store_id),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>{tr('cart_title')}</Text>
        <View style={s.switcher}>
          {(['stores', 'broadcast'] as Tab[]).map((tab) => {
            const active = activeTab === tab;
            const count = tab === 'stores' ? totalStoreItems : broadcastCount;
            return (
              <TouchableOpacity
                key={tab}
                style={[s.switchBtn, active && s.switchBtnActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Ionicons
                  name={tab === 'stores' ? 'storefront-outline' : 'megaphone-outline'}
                  size={14}
                  color={active ? Colors.primary : 'rgba(255,255,255,0.7)'}
                />
                <Text style={[s.switchTxt, active && s.switchTxtActive]}>
                  {tab === 'stores' ? (lang === 'ru' ? 'Магазины' : "Do'konlar") : tr('cart_broadcast')}
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

      {activeTab === 'stores' ? (
        storeList.length === 0 ? (
          <EmptyCart
            icon="storefront-outline"
            title={tr('cart_empty')}
            sub={tr('cart_empty_sub')}
            onBrowse={() => router.push('/(customer)/home')}
            browseTxt={tr('order_shop')}
          />
        ) : (
          <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
            {storeList.map((cart) => (
              <StoreCartCard
                key={cart.store_id}
                cart={cart}
                deliveryQuote={deliveryByStore[cart.store_id]}
                loading={orderingStoreId === cart.store_id}
                onOrder={() => orderFromStore(cart)}
                onClear={() => confirmClearStore(cart)}
                onRemoveItem={(spId) => removeStoreItem(cart.store_id, spId)}
                onUpdateQty={(spId, qty) => updateStoreQuantity(cart.store_id, spId, qty)}
                address={address}
                lang={lang}
                tr={tr}
              />
            ))}

            <View style={{ height: 40 }} />
          </ScrollView>
        )
      ) : broadcastItems.length === 0 ? (
        <EmptyCart
          icon="megaphone-outline"
          title={tr('cart_empty')}
          sub={tr('cart_empty_sub')}
          onBrowse={() => router.push('/(customer)/search')}
          browseTxt={tr('order_shop')}
        />
      ) : (
        <>
          <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
            <View style={s.broadcastBanner}>
              <Ionicons name="megaphone" size={20} color={Colors.white} />
              <Text style={s.broadcastBannerTxt}>{tr('cart_broadcast_banner')}</Text>
            </View>
            {broadcastItems.map((item, idx) => (
              <View key={item.product_id} style={[s.itemCard, idx > 0 && { marginTop: Spacing.sm }]}>
                <View style={s.itemImg}>
                  <Ionicons name="cube-outline" size={22} color={Colors.primaryLight} />
                </View>
                <View style={s.itemInfo}>
                  <Text style={s.itemName} numberOfLines={2}>{t(item.product_name)}</Text>
                  <Text style={s.itemPrice}>{item.quantity} {lang === 'ru' ? 'шт' : 'dona'}</Text>
                </View>
                <View style={s.qtyRow}>
                  <TouchableOpacity
                    style={s.qtyBtn}
                    onPress={() => item.quantity <= 1
                      ? removeBroadcastItem(item.product_id)
                      : updateBroadcastQuantity(item.product_id, item.quantity - 1)}
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
              <Text style={s.checkoutSub}>
                {broadcastCount} {lang === 'ru' ? 'шт товар' : 'ta mahsulot'}
              </Text>
              <Text style={s.checkoutTotal}>{tr('cart_broadcast')}</Text>
            </View>
            <TouchableOpacity
              style={s.checkoutBtn}
              onPress={() => {
                if (!requireAuth()) return;
                router.push('/(customer)/broadcast-cart');
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="megaphone" size={18} color={Colors.white} />
              <Text style={s.checkoutTxt}>{lang === 'ru' ? 'Отправить' : 'Yuborish'}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

// ─── StoreCartCard ─────────────────────────────────────────────────────────────
function StoreCartCard({
  cart, deliveryQuote, loading, onOrder, onClear, onRemoveItem, onUpdateQty,
  address, lang, tr,
}: {
  cart: StoreCart;
  deliveryQuote?: any;
  loading: boolean;
  onOrder: () => void;
  onClear: () => void;
  onRemoveItem: (storeProductId: string) => void;
  onUpdateQty: (storeProductId: string, qty: number) => void;
  address: string | null;
  lang: 'uz' | 'ru';
  tr: (k: any) => string;
}) {
  const subtotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const deliveryFee = deliveryQuote?.fee ?? 0;
  const deliveryFree = deliveryQuote?.is_free ?? false;
  const deliveryBlocked = deliveryQuote && !deliveryQuote.is_deliverable;
  const total = subtotal + (deliveryFree ? 0 : deliveryFee);
  const logoUri = imageUrl(cart.store_logo);

  return (
    <View style={sc.wrap}>
      {/* Store header */}
      <View style={sc.headerRow}>
        {logoUri ? (
          <Image source={{ uri: logoUri }} style={sc.logo} />
        ) : (
          <View style={[sc.logo, { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primarySurface }]}>
            <Ionicons name="storefront" size={18} color={Colors.primary} />
          </View>
        )}
        <Text style={sc.storeName} numberOfLines={1}>{cart.store_name}</Text>
        <TouchableOpacity onPress={onClear} hitSlop={8}>
          <Ionicons name="trash-outline" size={18} color={Colors.error} />
        </TouchableOpacity>
      </View>

      {/* Items */}
      {cart.items.map((item) => (
        <View key={item.store_product_id} style={sc.itemRow}>
          <View style={sc.itemImg}>
            {item.product_image ? (
              <Image source={{ uri: imageUrl(item.product_image)! }} style={sc.itemImgInner} />
            ) : (
              <Ionicons name="cube-outline" size={20} color={Colors.primaryLight} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={sc.itemName} numberOfLines={2}>{item.product_name}</Text>
            <Text style={sc.itemPrice}>
              {Number(item.price).toLocaleString()} so'm × {item.quantity}
            </Text>
          </View>
          <View style={sc.qtyRow}>
            <TouchableOpacity
              style={sc.qtyBtn}
              onPress={() =>
                item.quantity <= 1
                  ? onRemoveItem(item.store_product_id)
                  : onUpdateQty(item.store_product_id, item.quantity - 1)
              }
            >
              <Ionicons
                name={item.quantity <= 1 ? 'trash-outline' : 'remove'}
                size={14}
                color={item.quantity <= 1 ? Colors.error : Colors.primary}
              />
            </TouchableOpacity>
            <Text style={sc.qty}>{item.quantity}</Text>
            <TouchableOpacity
              style={[sc.qtyBtn, sc.qtyBtnAdd]}
              onPress={() => onUpdateQty(item.store_product_id, item.quantity + 1)}
            >
              <Ionicons name="add" size={14} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {/* Summary */}
      <View style={sc.divider} />
      <View style={sc.summaryRow}>
        <Text style={sc.summaryLabel}>
          {lang === 'ru' ? 'Товары' : 'Mahsulotlar'} · {cart.items.length}
        </Text>
        <Text style={sc.summaryValue}>{subtotal.toLocaleString()} so'm</Text>
      </View>
      <View style={sc.summaryRow}>
        <Text style={sc.summaryLabel}>{tr('cart_delivery')}</Text>
        {deliveryBlocked ? (
          <Text style={[sc.summaryValue, { color: Colors.error }]}>
            {lang === 'ru' ? 'Вне зоны' : 'Radius tashqarisida'}
          </Text>
        ) : deliveryFree ? (
          <Text style={[sc.summaryValue, { color: Colors.success }]}>{tr('cart_free')}</Text>
        ) : (
          <Text style={sc.summaryValue}>{deliveryFee.toLocaleString()} so'm</Text>
        )}
      </View>
      {deliveryQuote && !deliveryBlocked && (
        <Text style={sc.deliveryNote}>
          {lang === 'ru' ? 'Расстояние' : 'Masofa'}: {(deliveryQuote.distance_meters / 1000).toFixed(2)} km
        </Text>
      )}

      <View style={sc.totalRow}>
        <Text style={sc.totalLabel}>{tr('cart_total')}</Text>
        <Text style={sc.totalValue}>{total.toLocaleString()} so'm</Text>
      </View>

      {/* Address */}
      <View style={sc.addressCard}>
        <Ionicons name="location" size={14} color={Colors.primary} />
        <Text style={sc.addressTxt} numberOfLines={1}>
          {address ?? tr('cart_address')}
        </Text>
      </View>

      {/* Order button */}
      <TouchableOpacity
        style={[sc.orderBtn, (loading || deliveryBlocked) && { opacity: 0.5 }]}
        disabled={loading || !!deliveryBlocked}
        onPress={onOrder}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={16} color={Colors.white} />
            <Text style={sc.orderBtnTxt}>
              {tr('cart_checkout')} · {total.toLocaleString()} so'm
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

function EmptyCart({ icon, title, sub, onBrowse, browseTxt }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string; sub: string; onBrowse: () => void; browseTxt?: string;
}) {
  return (
    <View style={empty.wrap}>
      <View style={empty.iconBox}>
        <Ionicons name={icon} size={48} color={Colors.primaryLight} />
      </View>
      <Text style={empty.title}>{title}</Text>
      <Text style={empty.sub}>{sub}</Text>
      <TouchableOpacity style={empty.btn} onPress={onBrowse}>
        <Text style={empty.btnTxt}>{browseTxt ?? 'Xarid qilish'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
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
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, borderRadius: Radius.md,
  },
  switchBtnActive: { backgroundColor: Colors.white, ...Shadow.sm },
  switchTxt: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  switchTxtActive: { color: Colors.primary },
  switchBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: Radius.full,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  switchBadgeActive: { backgroundColor: Colors.primarySurface },
  switchBadgeTxt: { fontSize: 10, fontWeight: '700', color: Colors.white },

  scroll: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: Spacing.md, gap: Spacing.md },

  itemCard: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.md, flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, ...Shadow.sm,
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

  broadcastBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.lg, padding: Spacing.md,
  },
  broadcastBannerTxt: { flex: 1, fontSize: 13, color: Colors.white, lineHeight: 18 },

  checkoutBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 28 : Spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: Colors.border, ...Shadow.lg,
  },
  checkoutSub: { fontSize: 12, color: Colors.textHint },
  checkoutTotal: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  checkoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg, paddingVertical: 13,
    borderRadius: Radius.lg, ...Shadow.sm,
  },
  checkoutTxt: { fontSize: 15, fontWeight: '700', color: Colors.white },
});

// Store cart card styles
const sc = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  logo: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: Colors.background,
  },
  storeName: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.textPrimary },

  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  itemImg: {
    width: 44, height: 44, borderRadius: Radius.md,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  itemImgInner: { width: '100%', height: '100%' },
  itemName: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary, lineHeight: 17 },
  itemPrice: { fontSize: 12, fontWeight: '600', color: Colors.primary, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 9,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnAdd: { backgroundColor: Colors.primary },
  qty: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, minWidth: 18, textAlign: 'center' },

  divider: { height: 1, backgroundColor: Colors.divider, marginVertical: Spacing.sm },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 2,
  },
  summaryLabel: { fontSize: 13, color: Colors.textSecondary },
  summaryValue: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  deliveryNote: { fontSize: 10, color: Colors.textHint, marginTop: -1 },

  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1, borderTopColor: Colors.divider,
  },
  totalLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  totalValue: { fontSize: 17, fontWeight: '800', color: Colors.primary },

  addressCard: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primarySurface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm, paddingVertical: 8,
    marginTop: Spacing.sm,
  },
  addressTxt: { flex: 1, fontSize: 11, color: Colors.primary, fontWeight: '500' },

  orderBtn: {
    marginTop: Spacing.sm,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 13,
    borderRadius: Radius.lg,
    ...Shadow.sm,
  },
  orderBtnTxt: { fontSize: 14, fontWeight: '700', color: Colors.white },
});

const empty = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  iconBox: {
    width: 96, height: 96, borderRadius: 28,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  sub: { fontSize: 14, color: Colors.textHint, textAlign: 'center' },
  btn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    marginTop: Spacing.sm,
  },
  btnTxt: { fontSize: 15, fontWeight: '700', color: Colors.white },
});
