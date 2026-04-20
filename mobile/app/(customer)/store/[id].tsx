import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Image, Platform, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../../src/theme';
import { storesApi } from '../../../src/api/stores';
import { storeProductsApi } from '../../../src/api/products';
import { useCartStore } from '../../../src/store/cart.store';
import { useLocationStore } from '../../../src/store/location.store';
import { useAuthStore } from '../../../src/store/auth.store';
import { ordersApi } from '../../../src/api/orders';
import { useTranslation } from '../../../src/i18n';
import { useRequireAuth } from '../../../src/hooks/useRequireAuth';
import ProductDetailSheet from '../../../src/components/product/ProductDetailSheet';
import { haptics } from '../../../src/utils/haptics';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const PAGE_SIZE = 12;

function imageUrl(path?: string) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_URL}/${path}`;
}

export default function StoreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { lang, t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const requireAuth = useRequireAuth();
  const { lat, lng, address } = useLocationStore();
  const { storeCarts, addStoreItem, removeStoreItem, updateStoreQuantity, clearStoreCart } =
    useCartStore();

  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [detailProductId, setDetailProductId] = useState<number | null>(null);

  // Bu do'kon uchun savat global store'dan olinadi
  const myCart = id ? storeCarts[id] : undefined;
  const cartByStoreProductId = useMemo(() => {
    const map: Record<string, number> = {};
    myCart?.items.forEach((i) => {
      map[i.store_product_id] = i.quantity;
    });
    return map;
  }, [myCart]);

  // Store info
  const { data: store } = useQuery({
    queryKey: ['store', id],
    queryFn: () => storesApi.getById(id!),
    enabled: !!id,
  });

  // Store categories
  const { data: storeCategories = [] } = useQuery({
    queryKey: ['store-categories', id],
    queryFn: () => storeProductsApi.getCategories(id!),
    enabled: !!id,
  });

  // Store products (paginated)
  const {
    data: productPages,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['store-products-catalog', id, selectedCat, search],
    enabled: !!id,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) =>
      storeProductsApi.getCatalog({
        store_id: id!,
        q: search.trim() || undefined,
        category_id: selectedCat || undefined,
        page: pageParam as number,
        limit: PAGE_SIZE,
      }),
    getNextPageParam: (lastPage: any) =>
      lastPage?.meta?.hasMore ? lastPage.meta.page + 1 : undefined,
  });

  const products = useMemo(
    () => productPages?.pages.flatMap((p: any) => p?.items ?? []) ?? [],
    [productPages],
  );

  const cartTotal = useMemo(
    () => (myCart?.items ?? []).reduce((s, i) => s + Number(i.price) * i.quantity, 0),
    [myCart],
  );
  const cartCount = (myCart?.items ?? []).reduce((s, i) => s + i.quantity, 0);

  const addToCart = (sp: any) => {
    // Variantlari bo'lsa — sheet ochamiz
    if (sp.product?.children?.length > 0) {
      haptics.medium();
      setDetailProductId(Number(sp.product.id));
      return;
    }
    if (!store || !id) return;
    haptics.light();
    const img = sp.product?.images?.[0]?.url;
    addStoreItem(
      {
        store_product_id: sp.id,
        product_id: Number(sp.product?.id),
        store_id: id,
        store_name: store.name,
        product_name: t(sp.product?.name),
        product_image: img,
        price: Number(sp.price),
        quantity: 1,
      },
      store.logo ?? undefined,
    );
  };

  const removeFromCart = (spId: string) => {
    if (!id) return;
    haptics.light();
    const current = cartByStoreProductId[spId] ?? 0;
    if (current <= 1) removeStoreItem(id, spId);
    else updateStoreQuantity(id, spId, current - 1);
  };

  const handleOrder = async () => {
    if (!requireAuth()) return;
    if (!lat || !lng) {
      haptics.warning();
      Alert.alert(
        lang === 'ru' ? 'Нужна геолокация' : 'Joylashuv kerak',
        lang === 'ru' ? 'Включите геолокацию' : 'Joylashuvni yoqing',
      );
      return;
    }

    haptics.medium();
    setOrdering(true);
    try {
      const items = (myCart?.items ?? []).map((i) => ({
        store_product_id: i.store_product_id,
        quantity: i.quantity,
      }));
      if (items.length === 0) return;
      const order = await ordersApi.create({
        order_type: 'DIRECT',
        store_id: id,
        items,
        delivery_lat: lat,
        delivery_lng: lng,
        delivery_address: address ?? 'Manzil',
        payment_method: 'CASH',
      });
      haptics.success();
      if (id) clearStoreCart(id);
      router.push({ pathname: '/(customer)/order/[id]', params: { id: order.id } });
    } catch (e: any) {
      haptics.error();
      Alert.alert(
        lang === 'ru' ? 'Ошибка' : 'Xato',
        e?.response?.data?.message ?? (lang === 'ru' ? 'Ошибка' : 'Xato yuz berdi'),
      );
    } finally {
      setOrdering(false);
    }
  };

  const renderProduct = useCallback(({ item }: { item: any }) => {
    const img = item.product?.images?.[0]?.url;
    const qty = cartByStoreProductId[item.id] || 0;
    const outOfStock = item.stock === 0;

    return (
      <View style={ps.cardWrap}>
        <View style={ps.card}>
          {img ? (
            <Image source={{ uri: imageUrl(img)! }} style={ps.image} resizeMode="cover" />
          ) : (
            <View style={[ps.image, ps.imgPlaceholder]}>
              <Ionicons name="cube-outline" size={32} color={Colors.primaryLight} />
            </View>
          )}
          <View style={ps.info}>
            <Text style={ps.name} numberOfLines={2}>{t(item.product?.name)}</Text>
            <Text style={ps.price}>
              {Number(item.price).toLocaleString()} so'm
              {item.product?.unit?.short_name && (
                <Text style={ps.unit}>/{t(item.product.unit.short_name)}</Text>
              )}
            </Text>
            {outOfStock && (
              <Text style={ps.outOfStock}>{lang === 'ru' ? 'Нет в наличии' : 'Tugagan'}</Text>
            )}
          </View>
          {/* Qty controls */}
          <View style={ps.qtyRow}>
            {qty > 0 ? (
              <>
                <TouchableOpacity style={ps.qtyBtn} onPress={() => removeFromCart(item.id)}>
                  <Ionicons name={qty === 1 ? 'trash-outline' : 'remove'} size={16} color={qty === 1 ? Colors.error : Colors.primary} />
                </TouchableOpacity>
                <Text style={ps.qtyText}>{qty}</Text>
              </>
            ) : null}
            <TouchableOpacity
              style={[ps.qtyBtn, ps.qtyBtnAdd]}
              onPress={() => addToCart(item)}
              disabled={outOfStock}
            >
              <Ionicons name="add" size={16} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }, [cartByStoreProductId, t, lang, store, id]);

  const ListHeader = (
    <>
      {/* Store banner */}
      <View style={s.bannerWrap}>
        {store?.banner ? (
          <Image source={{ uri: imageUrl(store.banner)! }} style={s.banner} resizeMode="cover" />
        ) : (
          <View style={[s.banner, { backgroundColor: Colors.primarySurface, alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="storefront" size={48} color={Colors.primaryLight} />
          </View>
        )}
        <View style={s.bannerOverlay} />
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <View style={s.storeInfo}>
          {store?.logo ? (
            <Image source={{ uri: imageUrl(store.logo)! }} style={s.logo} />
          ) : (
            <View style={[s.logo, { backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="storefront" size={16} color={Colors.white} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.storeName}>{store?.name}</Text>
            <Text style={s.storeSub}>
              {store?.is_open
                ? (lang === 'ru' ? 'Открыт' : 'Ochiq')
                : (lang === 'ru' ? 'Закрыт' : 'Yopiq')}
              {' · '}⭐ {Number(store?.rating ?? 0).toFixed(1)}
            </Text>
          </View>
        </View>
      </View>

      {/* Store meta */}
      <View style={s.metaCard}>
        <Ionicons name="location-outline" size={14} color={Colors.textHint} />
        <Text style={s.metaText} numberOfLines={1}>{store?.address ?? (lang === 'ru' ? 'Адрес не указан' : "Manzil yo'q")}</Text>
      </View>

      {/* Category chips */}
      {storeCategories.length > 0 && (
        <FlatList
          data={storeCategories}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.xs, marginTop: Spacing.sm }}
          renderItem={({ item }: { item: any }) => {
            const active = selectedCat === item.id;
            return (
              <TouchableOpacity
                style={[s.catChip, active && s.catChipActive]}
                onPress={() => { haptics.select(); setSelectedCat(active ? null : item.id); }}
              >
                <Text style={[s.catChipTxt, active && s.catChipTxtActive]}>{t(item.name)}</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Products title */}
      <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.md, marginBottom: Spacing.xs }}>
        <Text style={s.sectionTitle}>{lang === 'ru' ? 'Товары' : 'Mahsulotlar'}</Text>
      </View>
    </>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <FlatList
        data={products}
        keyExtractor={(item: any) => item.id}
        numColumns={2}
        renderItem={renderProduct}
        style={{ flex: 1, backgroundColor: Colors.background }}
        columnWrapperStyle={{ paddingHorizontal: Spacing.md - 4, gap: 0 }}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={{ alignItems: 'center', paddingTop: 40, gap: Spacing.sm }}>
              <Ionicons name="cube-outline" size={40} color={Colors.textHint} />
              <Text style={{ color: Colors.textHint }}>{lang === 'ru' ? 'Товары не найдены' : 'Mahsulot topilmadi'}</Text>
            </View>
          )
        }
        ListFooterComponent={
          <View>
            {isFetchingNextPage && <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: Spacing.md }} />}
            <View style={{ height: cartCount > 0 ? 120 : 100 }} />
          </View>
        }
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetch()} tintColor={Colors.primary} colors={[Colors.primary]} />}
        showsVerticalScrollIndicator={false}
      />

      {/* Checkout bar */}
      {cartCount > 0 && (
        <View style={s.checkoutBar}>
          <View>
            <Text style={s.checkoutSub}>{cartCount} {lang === 'ru' ? 'товар' : 'ta mahsulot'}</Text>
            <Text style={s.checkoutTotal}>{cartTotal.toLocaleString()} so'm</Text>
          </View>
          <TouchableOpacity
            style={[s.checkoutBtn, ordering && { opacity: 0.7 }]}
            onPress={handleOrder}
            disabled={ordering}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
            <Text style={s.checkoutTxt}>
              {ordering ? (lang === 'ru' ? 'Отправка...' : 'Yuborilmoqda...') : (lang === 'ru' ? 'Заказать' : 'Buyurtma berish')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ProductDetailSheet
        productId={detailProductId}
        onClose={() => setDetailProductId(null)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  bannerWrap: { height: 200, position: 'relative' },
  banner: { width: '100%', height: '100%' },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  backBtn: {
    position: 'absolute', top: Platform.OS === 'android' ? 10 : 8, left: 12,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  storeInfo: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
  },
  logo: { width: 44, height: 44, borderRadius: 14, borderWidth: 2, borderColor: Colors.white },
  storeName: { fontSize: 20, fontWeight: '800', color: Colors.white },
  storeSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  metaCard: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: Spacing.md, marginTop: Spacing.sm,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.sm, ...Shadow.sm,
  },
  metaText: { fontSize: 13, color: Colors.textSecondary, flex: 1 },

  catChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: Radius.full, backgroundColor: Colors.white,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catChipTxt: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  catChipTxtActive: { color: Colors.white },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },

  checkoutBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 28 : Spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: Colors.border, ...Shadow.lg,
  },
  checkoutSub: { fontSize: 12, color: Colors.textHint },
  checkoutTotal: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  checkoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg, paddingVertical: 13,
    borderRadius: Radius.lg, ...Shadow.sm,
  },
  checkoutTxt: { fontSize: 15, fontWeight: '700', color: Colors.white },
});

const ps = StyleSheet.create({
  cardWrap: { width: '50%', paddingHorizontal: 4, marginBottom: Spacing.sm },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, overflow: 'hidden', ...Shadow.sm },
  image: { width: '100%', height: 120, backgroundColor: Colors.background },
  imgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  info: { padding: Spacing.sm, gap: 2 },
  name: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary, lineHeight: 17 },
  price: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  unit: { fontSize: 11, fontWeight: '500', color: Colors.textHint },
  outOfStock: { fontSize: 11, color: Colors.error, fontWeight: '600' },
  qtyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    gap: 6, paddingHorizontal: Spacing.sm, paddingBottom: Spacing.sm,
  },
  qtyBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnAdd: { backgroundColor: Colors.primary },
  qtyText: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, minWidth: 20, textAlign: 'center' },
});
