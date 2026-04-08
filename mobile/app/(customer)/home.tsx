import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Animated,
  Dimensions,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../src/theme';
import { useLocation } from '../../src/hooks/useLocation';
import { storesApi } from '../../src/api/stores';
import { productsApi, categoriesApi } from '../../src/api/products';
import { t } from '../../src/i18n';
import { useLangStore } from '../../src/store/lang.store';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W * 0.62;
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

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
  return (
    <Animated.View
      style={[{ width: w as any, height: h, borderRadius: radius, backgroundColor: '#E8E8E8', opacity: anim }, style]}
    />
  );
}

function StoreCardSkeleton() {
  return (
    <View style={{ width: CARD_W, backgroundColor: Colors.white, borderRadius: Radius.lg, overflow: 'hidden', ...Shadow.sm, marginRight: Spacing.sm }}>
      <SkeletonBox w="100%" h={110} radius={0} />
      <View style={{ padding: Spacing.sm, gap: 6 }}>
        <SkeletonBox w="70%" h={14} />
        <SkeletonBox w="45%" h={11} />
      </View>
    </View>
  );
}

function ProductCardSkeleton() {
  return (
    <View style={{ width: '48%', backgroundColor: Colors.white, borderRadius: Radius.lg, overflow: 'hidden', ...Shadow.sm }}>
      <SkeletonBox w="100%" h={130} radius={0} />
      <View style={{ padding: Spacing.sm, gap: 6 }}>
        <SkeletonBox w="80%" h={12} />
        <SkeletonBox w="55%" h={12} />
        <SkeletonBox w="40%" h={14} />
      </View>
    </View>
  );
}

// ─── Store Card ───────────────────────────────────────────────────────────────
function PrimeStoreCard({ store, onPress }: { store: any; onPress: () => void }) {
  const img = imageUrl(store.banner);
  return (
    <TouchableOpacity style={[storeStyles.card, { width: CARD_W }]} onPress={onPress} activeOpacity={0.9}>
      {img ? (
        <Image source={{ uri: img }} style={storeStyles.banner} resizeMode="cover" />
      ) : (
        <View style={[storeStyles.banner, storeStyles.bannerPlaceholder]}>
          <Ionicons name="storefront" size={40} color={Colors.primaryLight} />
        </View>
      )}
      {/* gradient overlay */}
      <View style={storeStyles.overlay} />
      {/* premium badge */}
      <View style={storeStyles.premiumBadge}>
        <Ionicons name="star" size={10} color="#F57F17" />
        <Text style={storeStyles.premiumText}>Premium</Text>
      </View>
      {/* store info */}
      <View style={storeStyles.infoOverlay}>
        {store.logo ? (
          <Image source={{ uri: imageUrl(store.logo)! }} style={storeStyles.logo} />
        ) : (
          <View style={[storeStyles.logo, storeStyles.logoPlaceholder]}>
            <Ionicons name="storefront" size={14} color={Colors.white} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={storeStyles.storeName} numberOfLines={1}>{store.name}</Text>
          <Text style={storeStyles.storeSubtitle} numberOfLines={1}>
            <Ionicons name="time-outline" size={10} color="rgba(255,255,255,0.8)" /> 20–35 min
          </Text>
        </View>
        <View style={storeStyles.arrowBtn}>
          <Ionicons name="chevron-forward" size={14} color={Colors.white} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({
  product,
  onPress,
  lang: cardLang,
}: {
  product: any;
  onPress: () => void;
  lang?: import('../../src/i18n').Lang;
}) {
  const img = product.images?.[0]?.url;
  const price = product.store_products?.[0]?.price;
  return (
    <TouchableOpacity style={productStyles.card} onPress={onPress} activeOpacity={0.9}>
      {img ? (
        <Image source={{ uri: imageUrl(img)! }} style={productStyles.image} resizeMode="cover" />
      ) : (
        <View style={[productStyles.image, productStyles.imagePlaceholder]}>
          <Ionicons name="cube-outline" size={36} color={Colors.primaryLight} />
        </View>
      )}
      <View style={productStyles.info}>
        <Text style={productStyles.name} numberOfLines={2}>
          {t(product.name, cardLang)}
        </Text>
        {price != null && (
          <Text style={productStyles.price}>
            {Number(price).toLocaleString()} so'm
          </Text>
        )}
      </View>
      <TouchableOpacity style={productStyles.addBtn} onPress={onPress} activeOpacity={0.85}>
        <Ionicons name="add" size={18} color={Colors.white} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─── Category Chip ────────────────────────────────────────────────────────────
function CategoryChip({ item, lang }: { item: any; lang: any }) {
  const img = imageUrl(item.image);
  return (
    <TouchableOpacity style={catStyles.chip} activeOpacity={0.8}>
      <View style={catStyles.iconCircle}>
        {img ? (
          <Image source={{ uri: img }} style={catStyles.icon} resizeMode="cover" />
        ) : (
          <Ionicons name="grid-outline" size={20} color={Colors.primary} />
        )}
      </View>
      <Text style={catStyles.label} numberOfLines={1}>
        {t(item.name, lang)}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Promo Banner ─────────────────────────────────────────────────────────────
function PromoBanner({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={promoStyles.banner} onPress={onPress} activeOpacity={0.9}>
      <View style={promoStyles.textBlock}>
        <Text style={promoStyles.label}>Umumiy buyurtma</Text>
        <Text style={promoStyles.title}>Tez va arzon{'\n'}yetkazib berish</Text>
        <View style={promoStyles.btn}>
          <Text style={promoStyles.btnText}>Buyurtma berish</Text>
          <Ionicons name="arrow-forward" size={14} color={Colors.white} />
        </View>
      </View>
      <View style={promoStyles.iconBlock}>
        <Text style={{ fontSize: 64 }}>🚀</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <View style={sectionStyles.row}>
      <Text style={sectionStyles.title}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity style={sectionStyles.seeAllBtn} onPress={onSeeAll}>
          <Text style={sectionStyles.seeAll}>Barchasi</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const { address, permissionGranted } = useLocation();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const scrollY = useRef(new Animated.Value(0)).current;

  const { data: primeStores, isLoading: loadingStores, refetch: refetchPrime } = useQuery({
    queryKey: ['prime-stores'],
    queryFn: () => storesApi.getPrime(undefined, undefined),
  });

  const { data: productsData, isLoading: loadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ['products-catalog'],
    queryFn: () => productsApi.getCatalog({ limit: 20 }),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
  });

  const products = Array.isArray(productsData)
    ? productsData
    : Array.isArray(productsData?.items)
    ? productsData.items
    : [];

  const headerScale = scrollY.interpolate({
    inputRange: [-60, 0],
    outputRange: [1.08, 1],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ── */}
      <Animated.View style={[styles.header, { transform: [{ scale: headerScale }] }]}>
        <View style={styles.headerTop}>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={styles.locationText} numberOfLines={1}>
              {address ?? (permissionGranted ? 'Joylashuv aniqlanmoqda...' : 'Joylashuvga ruxsat bering')}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.langPill}
            onPress={() => setLang(lang === 'uz' ? 'ru' : 'uz')}
            activeOpacity={0.8}
          >
            <Text style={styles.langText}>{lang.toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.brand}>Yaqin Market</Text>

        {/* Search bar */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push('/(customer)/search')}
          activeOpacity={0.9}
        >
          <Ionicons name="search" size={18} color={Colors.textHint} />
          <Text style={styles.searchPlaceholder}>Mahsulot yoki do'kon qidiring...</Text>
          <View style={styles.searchFilter}>
            <Ionicons name="options-outline" size={16} color={Colors.primary} />
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* ── Content ── */}
      <Animated.ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={loadingStores || loadingProducts}
            onRefresh={() => { refetchPrime(); refetchProducts(); }}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >

        {/* Promo Banner — floats over header bottom */}
        <View style={[styles.section, { marginTop: -Spacing.lg }]}>
          <PromoBanner onPress={() => router.push('/(customer)/broadcast-cart')} />
        </View>

        {/* Categories */}
        {(categories?.length ?? 0) > 0 && (
          <View style={[styles.section, { paddingHorizontal: 0 }]}>
            <View style={{ paddingHorizontal: Spacing.md }}>
              <SectionHeader title="Kategoriyalar" />
            </View>
            <FlatList
              data={categories}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.horizontalPad}
              renderItem={({ item }) => <CategoryChip item={item} lang={lang} />}
            />
          </View>
        )}

        {/* Premium Stores */}
        <View style={[styles.section, { paddingHorizontal: 0 }]}>
          <View style={{ paddingHorizontal: Spacing.md }}>
            <SectionHeader
              title="Premium do'konlar"
              onSeeAll={() => router.push('/(customer)/search')}
            />
          </View>
          {loadingStores ? (
            <FlatList
              data={[1, 2, 3]}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => String(item)}
              contentContainerStyle={styles.horizontalPad}
              renderItem={() => <StoreCardSkeleton />}
            />
          ) : (primeStores?.length ?? 0) > 0 ? (
            <FlatList
              data={primeStores}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.horizontalPad}
              renderItem={({ item }) => (
                <PrimeStoreCard
                  store={item}
                  onPress={() =>
                    router.push({ pathname: '/(customer)/store/[id]', params: { id: item.id } })
                  }
                />
              )}
            />
          ) : (
            <View style={styles.emptyRowCard}>
              <View style={styles.emptyRowIcon}>
                <Ionicons name="storefront-outline" size={20} color={Colors.textHint} />
              </View>
              <View>
                <Text style={styles.emptyRowTitle}>Do'konlar topilmadi</Text>
                <Text style={styles.emptyRowSub}>Joylashuv aniqlanganda ko'rinadi</Text>
              </View>
            </View>
          )}
        </View>

        {/* All Products */}
        <View style={styles.section}>
          <SectionHeader title="Barcha mahsulotlar" />
          {loadingProducts ? (
            <View style={styles.productGrid}>
              {[1, 2, 3, 4].map((i) => <ProductCardSkeleton key={i} />)}
            </View>
          ) : products.length > 0 ? (
            <View style={styles.productGrid}>
              {products.map((product: any) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  lang={lang}
                  onPress={() =>
                    router.push({ pathname: '/(customer)/product/[id]', params: { id: product.id } })
                  }
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="cube-outline" size={32} color={Colors.primaryLight} />
              </View>
              <Text style={styles.emptyTitle}>Mahsulotlar topilmadi</Text>
              <Text style={styles.emptySubtitle}>Server bilan ulanishni tekshiring</Text>
            </View>
          )}
        </View>

        <View style={{ height: Spacing.xl * 2 }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
    paddingTop: Platform.OS === 'android' ? Spacing.sm : 0,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  locationText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
  },
  langPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    minWidth: 40,
    alignItems: 'center',
  },
  langText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  brand: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.5,
    marginBottom: Spacing.md,
  },
  searchBar: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.md,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: Colors.textHint,
  },
  searchFilter: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  section: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  horizontalPad: {
    paddingHorizontal: Spacing.md,
    paddingRight: Spacing.lg,
    gap: Spacing.sm,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  emptyRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    ...Shadow.sm,
  },
  emptyRowIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyRowTitle: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  emptyRowSub: { fontSize: 12, color: Colors.textHint, marginTop: 2 },
  emptyText: { fontSize: 13, color: Colors.textHint },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyIconBox: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  emptySubtitle: { fontSize: 12, color: Colors.textHint, textAlign: 'center' },
});

const sectionStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAll: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
});

const storeStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.md,
  },
  banner: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.primarySurface,
  },
  bannerPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    top: 60,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  premiumBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  premiumText: { fontSize: 10, color: '#F57F17', fontWeight: '700' },
  infoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  logoPlaceholder: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeName: { fontSize: 13, fontWeight: '700', color: Colors.white },
  storeSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  arrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const productStyles = StyleSheet.create({
  card: {
    width: '48.5%',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  image: {
    width: '100%',
    height: 130,
    backgroundColor: Colors.background,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    padding: Spacing.sm,
    paddingBottom: 4,
    gap: 3,
  },
  name: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 2,
  },
  addBtn: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
});

const catStyles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    gap: 6,
    width: 72,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
    overflow: 'hidden',
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

const promoStyles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    overflow: 'hidden',
    minHeight: 110,
    ...Shadow.lg,
  },
  textBlock: {
    flex: 1,
    padding: Spacing.md,
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.white,
    lineHeight: 24,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  btnText: { fontSize: 12, fontWeight: '700', color: Colors.white },
  iconBlock: {
    width: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
