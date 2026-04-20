import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Image, Animated, Platform, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { useLocation } from '../../src/hooks/useLocation';
import { useLocationStore } from '../../src/store/location.store';
import { storesApi } from '../../src/api/stores';
import { productsApi, categoriesApi } from '../../src/api/products';
import { useTranslation } from '../../src/i18n';
import ProductDetailSheet from '../../src/components/product/ProductDetailSheet';
import CheapestStoresSheet from '../../src/components/product/CheapestStoresSheet';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const PAGE_SIZE = 12;
const STORE_INSERT_EVERY = 8; // har 8 productdan keyin prime store ko'rsatamiz

function imageUrl(path?: string) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_URL}/${path}`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonBox({ w, h, radius = 8, style }: { w: number | string; h: number; radius?: number; style?: any }) {
  const anim = useRef(new Animated.Value(0.4)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 750, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[{ width: w as any, height: h, borderRadius: radius, backgroundColor: '#E8E8E8', opacity: anim }, style]} />;
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({
  product, onPress, onCheapest, t,
}: {
  product: any;
  onPress: () => void;
  onCheapest: () => void;
  t: (n: any) => string;
}) {
  const img = product.images?.[0]?.url;
  const unit = product.unit?.short_name ? t(product.unit.short_name) : null;
  return (
    <TouchableOpacity style={productStyles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={productStyles.imageWrap}>
        {img ? (
          <Image source={{ uri: imageUrl(img)! }} style={productStyles.image} resizeMode="cover" />
        ) : (
          <View style={[productStyles.image, productStyles.imagePlaceholder]}>
            <Ionicons name="cube-outline" size={36} color={Colors.primaryLight} />
          </View>
        )}
        {unit && (
          <View style={productStyles.unitBadge}>
            <Text style={productStyles.unitBadgeTxt}>{unit}</Text>
          </View>
        )}
      </View>
      <View style={productStyles.info}>
        <Text style={productStyles.name} numberOfLines={2}>{t(product.name)}</Text>
      </View>
      <View style={productStyles.footer}>
        <TouchableOpacity
          style={productStyles.cheapBtn}
          onPress={(e) => { e.stopPropagation(); onCheapest(); }}
          activeOpacity={0.85}
        >
          <Ionicons name="flash" size={14} color={Colors.success} />
          <Text style={productStyles.cheapBtnTxt}>{t({ uz: 'Arzon', ru: 'Дёшево' })}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={productStyles.addBtn}
          onPress={(e) => { e.stopPropagation(); onPress(); }}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Prime Store Card (inline — productlar orasida) ──────────────────────────
function PrimeStoreInline({ store, onPress }: { store: any; onPress: () => void }) {
  const img = imageUrl(store.banner);
  return (
    <TouchableOpacity style={storeInlineStyles.card} onPress={onPress} activeOpacity={0.9}>
      {img ? (
        <Image source={{ uri: img }} style={storeInlineStyles.banner} resizeMode="cover" />
      ) : (
        <View style={[storeInlineStyles.banner, { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primarySurface }]}>
          <Ionicons name="storefront" size={28} color={Colors.primaryLight} />
        </View>
      )}
      <View style={storeInlineStyles.overlay} />
      <View style={storeInlineStyles.badge}>
        <Ionicons name="star" size={9} color="#F57F17" />
        <Text style={storeInlineStyles.badgeText}>Premium</Text>
      </View>
      <View style={storeInlineStyles.info}>
        {store.logo ? (
          <Image source={{ uri: imageUrl(store.logo)! }} style={storeInlineStyles.logo} />
        ) : (
          <View style={[storeInlineStyles.logo, { backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="storefront" size={12} color={Colors.white} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={storeInlineStyles.name} numberOfLines={1}>{store.name}</Text>
          <Text style={storeInlineStyles.sub} numberOfLines={1}>
            <Ionicons name="time-outline" size={9} color="rgba(255,255,255,0.8)" /> 20–35 min
          </Text>
        </View>
        <View style={storeInlineStyles.arrow}>
          <Ionicons name="chevron-forward" size={14} color={Colors.white} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Category Chip ────────────────────────────────────────────────────────────
function CategoryChip({ item, active, onPress, t }: { item: any; active: boolean; onPress: () => void; t: (n: any) => string }) {
  const img = imageUrl(item.image);
  return (
    <TouchableOpacity
      style={[catStyles.chip, active && catStyles.chipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[catStyles.iconCircle, active && catStyles.iconCircleActive]}>
        {img ? (
          <Image source={{ uri: img }} style={catStyles.icon} resizeMode="cover" />
        ) : (
          <Ionicons name="grid-outline" size={18} color={active ? Colors.white : Colors.primary} />
        )}
      </View>
      <Text style={[catStyles.label, active && catStyles.labelActive]} numberOfLines={1}>
        {t(item.name)}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const { address, permissionGranted } = useLocation();
  const { lat, lng } = useLocationStore();
  const { lang, t, tr } = useTranslation();
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [cheapestProduct, setCheapestProduct] = useState<{ id: number; name: any } | null>(null);

  const { data: primeStores } = useQuery({
    queryKey: ['prime-stores', lat, lng],
    queryFn: () => storesApi.getPrime(lat ?? null, lng ?? null),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
  });

  const {
    data: productPages,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['home-products', selectedCat, lat, lng],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await productsApi.getCatalog({
        category_id: selectedCat ?? undefined,
        page: pageParam as number,
        limit: PAGE_SIZE,
        // Location bor bo'lsa — faqat user'ga yetkazib beradigan do'konlar productlari
        lat: lat ?? undefined,
        lng: lng ?? undefined,
        deliverable: lat != null && lng != null ? true : undefined,
      });
      return res;
    },
    getNextPageParam: (lastPage: any) => {
      if (lastPage?.meta?.hasMore) return lastPage.meta.page + 1;
      if (Array.isArray(lastPage) && lastPage.length >= PAGE_SIZE) return undefined;
      return undefined;
    },
  });

  const allProducts = productPages?.pages.flatMap((p: any) =>
    Array.isArray(p) ? p : Array.isArray(p?.items) ? p.items : []
  ) ?? [];

  // Row-based layout: har qator 2 ta product yoki 1 ta to'liq prime store
  type Row =
    | { type: 'products'; items: any[] }
    | { type: 'store'; store: any };
  const primeList = primeStores ?? [];
  const rows: Row[] = [];
  let storeIdx = 0;
  let productIdx = 0;
  while (productIdx < allProducts.length) {
    const pair = allProducts.slice(productIdx, productIdx + 2);
    rows.push({ type: 'products', items: pair });
    productIdx += 2;
    // Har 4 qatordan keyin (= ~8 product) prime store
    if (rows.length % 4 === 0 && storeIdx < primeList.length) {
      rows.push({ type: 'store', store: primeList[storeIdx] });
      storeIdx++;
    }
  }

  const toggleCategory = (catId: string) => {
    setSelectedCat(prev => prev === catId ? null : catId);
  };

  const renderItem = useCallback(({ item }: { item: Row }) => {
    if (item.type === 'store') {
      return (
        <View style={{ paddingHorizontal: Spacing.md, marginBottom: Spacing.sm }}>
          <PrimeStoreInline
            store={item.store}
            onPress={() => router.push({ pathname: '/(customer)/store/[id]', params: { id: item.store.id } })}
          />
        </View>
      );
    }
    return (
      <View style={{ flexDirection: 'row', paddingHorizontal: Spacing.md - Spacing.xs }}>
        {item.items.map((p, i) => (
          <View key={p.id ?? i} style={{ flex: 1, paddingHorizontal: Spacing.xs }}>
            <ProductCard
              product={p}
              t={t}
              onPress={() => setSelectedProductId(p.id)}
              onCheapest={() => setCheapestProduct({ id: p.id, name: p.name })}
            />
          </View>
        ))}
        {item.items.length === 1 && <View style={{ flex: 1, paddingHorizontal: Spacing.xs }} />}
      </View>
    );
  }, [t, router]);

  const ListHeader = (
    <>
      {/* Search bar */}
      <View style={styles.searchWrap}>
        <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/(customer)/search')} activeOpacity={0.9}>
          <Ionicons name="search" size={18} color={Colors.textHint} />
          <Text style={styles.searchPlaceholder}>{tr('search_placeholder')}</Text>
          <TouchableOpacity style={styles.mapBtn} onPress={() => router.push('/(customer)/stores-map')} activeOpacity={0.8}>
            <Ionicons name="map-outline" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </TouchableOpacity>
      </View>

      {/* Promo Banner */}
      <TouchableOpacity style={promoStyles.banner} onPress={() => router.push('/(customer)/broadcast-cart')} activeOpacity={0.9}>
        <View style={promoStyles.textBlock}>
          <Text style={promoStyles.label}>{tr('promo_label')}</Text>
          <Text style={promoStyles.title}>{tr('promo_title')}</Text>
          <View style={promoStyles.btn}>
            <Text style={promoStyles.btnText}>{tr('promo_btn')}</Text>
            <Ionicons name="arrow-forward" size={14} color={Colors.white} />
          </View>
        </View>
        <View style={promoStyles.iconBlock}>
          <Ionicons name="rocket-outline" size={48} color="rgba(255,255,255,0.3)" />
        </View>
      </TouchableOpacity>

      {/* Category chips */}
      {(categories?.length ?? 0) > 0 && (
        <View style={{ marginTop: Spacing.md }}>
          <FlatList
            data={categories}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.xs }}
            renderItem={({ item }) => (
              <CategoryChip
                item={item}
                active={selectedCat === String(item.id)}
                onPress={() => toggleCategory(String(item.id))}
                t={t}
              />
            )}
          />
        </View>
      )}

      {/* Section title */}
      <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.md, marginBottom: Spacing.sm }}>
        <Text style={styles.sectionTitle}>
          {selectedCat
            ? t(categories?.find((c: any) => String(c.id) === selectedCat)?.name)
            : (lang === 'ru' ? 'Все товары' : 'Barcha mahsulotlar')}
        </Text>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={styles.locationText} numberOfLines={1}>
              {address ?? (permissionGranted ? tr('location_detecting') : tr('location_allow'))}
            </Text>
          </View>
          <TouchableOpacity style={styles.locationBtn} onPress={() => router.push('/(customer)/my-locations')}>
            <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>
        <Text style={styles.brand}>Yaqin Market</Text>
      </View>

      {/* Content — FlatList (rows: 2 products per row yoki 1 prime store) */}
      <FlatList
        data={rows}
        keyExtractor={(item, idx) =>
          item.type === 'store' ? `s-${item.store.id}` : `p-${idx}`
        }
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.productGrid}>
              {[1, 2, 3, 4].map(i => (
                <View key={i} style={{ width: '48%', backgroundColor: Colors.white, borderRadius: Radius.lg, overflow: 'hidden', ...Shadow.sm }}>
                  <SkeletonBox w="100%" h={130} radius={0} />
                  <View style={{ padding: Spacing.sm, gap: 6 }}>
                    <SkeletonBox w="80%" h={12} />
                    <SkeletonBox w="40%" h={14} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="cube-outline" size={32} color={Colors.primaryLight} />
              </View>
              <Text style={styles.emptyTitle}>{tr('empty_products')}</Text>
              <Text style={styles.emptySubtitle}>{tr('empty_products_sub')}</Text>
            </View>
          )
        }
        ListFooterComponent={
          <View style={{ paddingVertical: Spacing.md, alignItems: 'center' }}>
            {isFetchingNextPage && <ActivityIndicator size="small" color={Colors.primary} />}
            <View style={{ height: 100 }} />
          </View>
        }
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => refetch()} tintColor={Colors.primary} colors={[Colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={{ backgroundColor: Colors.background }}
      />
      <ProductDetailSheet
        productId={selectedProductId}
        onClose={() => setSelectedProductId(null)}
      />
      <CheapestStoresSheet
        productId={cheapestProduct?.id ?? null}
        productName={cheapestProduct?.name}
        onClose={() => setCheapestProduct(null)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    paddingTop: Platform.OS === 'android' ? Spacing.sm : 0,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  locationText: { fontSize: 12, color: 'rgba(255,255,255,0.85)', flex: 1 },
  locationBtn: { padding: 6 },
  brand: { fontSize: 26, fontWeight: '800', color: Colors.white, letterSpacing: -0.5 },
  searchWrap: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  searchBar: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg, height: 48,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, gap: Spacing.sm,
    ...Shadow.md,
  },
  searchPlaceholder: { flex: 1, fontSize: 14, color: Colors.textHint },
  mapBtn: {
    width: 32, height: 32, borderRadius: Radius.sm,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { flex: 1, backgroundColor: Colors.background },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  productGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: Spacing.sm, paddingHorizontal: Spacing.md, marginTop: Spacing.sm,
  },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.lg, gap: Spacing.sm },
  emptyIconBox: { width: 64, height: 64, borderRadius: 20, backgroundColor: Colors.primarySurface, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  emptySubtitle: { fontSize: 12, color: Colors.textHint, textAlign: 'center' },
});

const productStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    overflow: 'hidden', ...Shadow.sm, marginBottom: Spacing.sm,
  },
  imageWrap: { position: 'relative' },
  image: { width: '100%', height: 130, backgroundColor: Colors.background },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  unitBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radius.full,
    ...Shadow.sm,
  },
  unitBadgeTxt: {
    fontSize: 10, fontWeight: '700', color: Colors.textPrimary,
    textTransform: 'lowercase', letterSpacing: 0.3,
  },
  info: { paddingHorizontal: Spacing.sm, paddingTop: Spacing.sm, paddingBottom: 6 },
  name: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary, lineHeight: 18 },
  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
    paddingTop: 4,
  },
  cheapBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    height: 32, borderRadius: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  cheapBtnTxt: { fontSize: 11, fontWeight: '700', color: Colors.success },
  addBtn: {
    width: 34, height: 32, borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
});

const storeInlineStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white, borderRadius: Radius.xl,
    overflow: 'hidden', ...Shadow.md, height: 140,
  },
  banner: { width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  badge: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FFF8E1', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full,
  },
  badgeText: { fontSize: 10, color: '#F57F17', fontWeight: '700' },
  info: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
  },
  logo: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: Colors.white },
  name: { fontSize: 14, fontWeight: '700', color: Colors.white },
  sub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  arrow: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
});

const catStyles = StyleSheet.create({
  chip: { alignItems: 'center', gap: 5, width: 68 },
  chipActive: {},
  iconCircle: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.sm, overflow: 'hidden',
    borderWidth: 2, borderColor: 'transparent',
  },
  iconCircleActive: { borderColor: Colors.primary, backgroundColor: Colors.primarySurface },
  icon: { width: 50, height: 50, borderRadius: 25 },
  label: { fontSize: 10, fontWeight: '500', color: Colors.textSecondary, textAlign: 'center' },
  labelActive: { color: Colors.primary, fontWeight: '700' },
});

const promoStyles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.primaryDark, borderRadius: Radius.xl,
    flexDirection: 'row', overflow: 'hidden', minHeight: 110,
    marginHorizontal: Spacing.md, marginTop: Spacing.md, ...Shadow.lg,
  },
  textBlock: { flex: 1, padding: Spacing.md, gap: 4 },
  label: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5, textTransform: 'uppercase' },
  title: { fontSize: 18, fontWeight: '800', color: Colors.white, lineHeight: 24 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  btnText: { fontSize: 12, fontWeight: '700', color: Colors.white },
  iconBlock: { width: 100, alignItems: 'center', justifyContent: 'center' },
});
