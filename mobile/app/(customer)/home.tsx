import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../src/theme';
import { useLocation } from '../../src/hooks/useLocation';
import { storesApi } from '../../src/api/stores';
import { productsApi, categoriesApi } from '../../src/api/products';
import { t } from '../../src/i18n';
import { useLangStore } from '../../src/store/lang.store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

function imageUrl(path?: string) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_URL}/${path}`;
}

function PrimeStoreCard({ store, onPress }: { store: any; onPress: () => void }) {
  return (
    <TouchableOpacity style={storeStyles.card} onPress={onPress} activeOpacity={0.85}>
      {store.banner ? (
        <Image source={{ uri: imageUrl(store.banner)! }} style={storeStyles.banner} />
      ) : (
        <View style={[storeStyles.banner, storeStyles.bannerPlaceholder]}>
          <Text style={storeStyles.bannerEmoji}>🏪</Text>
        </View>
      )}
      <View style={storeStyles.info}>
        <View style={storeStyles.row}>
          {store.logo ? (
            <Image source={{ uri: imageUrl(store.logo)! }} style={storeStyles.logo} />
          ) : (
            <View style={[storeStyles.logo, storeStyles.logoPlaceholder]}>
              <Text>🏪</Text>
            </View>
          )}
          <View style={storeStyles.textBlock}>
            <Text style={storeStyles.name} numberOfLines={1}>{store.name}</Text>
            <View style={storeStyles.tags}>
              <View style={storeStyles.primeBadge}>
                <Text style={storeStyles.primeBadgeText}>⭐ Premium</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ProductCard({ product, onPress, lang: cardLang }: { product: any; onPress: () => void; lang?: import('../../src/i18n').Lang }) {
  const img = product.images?.[0]?.url;
  return (
    <TouchableOpacity style={productStyles.card} onPress={onPress} activeOpacity={0.85}>
      {img ? (
        <Image source={{ uri: imageUrl(img)! }} style={productStyles.image} />
      ) : (
        <View style={[productStyles.image, productStyles.imagePlaceholder]}>
          <Text style={{ fontSize: 32 }}>📦</Text>
        </View>
      )}
      <View style={productStyles.info}>
        <Text style={productStyles.name} numberOfLines={2}>{t(product.name, cardLang)}</Text>
        {product.store_products?.[0] && (
          <Text style={productStyles.price}>
            {Number(product.store_products[0].price).toLocaleString()} so'm
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { lat, lng, address, permissionGranted } = useLocation();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);

  const {
    data: primeStores,
    isLoading: loadingPrime,
    refetch: refetchPrime,
  } = useQuery({
    queryKey: ['prime-stores', lat, lng],
    queryFn: () => storesApi.getPrime(lat!, lng!),
    enabled: !!lat && !!lng,
  });

  const {
    data: productsData,
    isLoading: loadingProducts,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ['products-catalog'],
    queryFn: () => productsApi.getCatalog({ limit: 20 }),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
  });

  const isLoading = loadingPrime || loadingProducts;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Yaqin Market 🛒</Text>
          <Text style={styles.location} numberOfLines={1}>
            📍 {address ?? (permissionGranted ? 'Joylashuv aniqlanmoqda...' : 'Joylashuvga ruxsat bering')}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.langToggle}
            onPress={() => setLang(lang === 'uz' ? 'ru' : 'uz')}
            activeOpacity={0.8}
          >
            <Text style={styles.langToggleText}>{lang === 'uz' ? 'UZ' : 'RU'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.broadcastBtn}
            onPress={() => router.push('/(customer)/broadcast-cart')}
            activeOpacity={0.85}
          >
            <Text style={styles.broadcastBtnText}>📢 Umumiy buyurtma</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => { refetchPrime(); refetchProducts(); }}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Premium Stores */}
        {(primeStores?.length ?? 0) > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>⭐ Premium do'konlar</Text>
              <TouchableOpacity onPress={() => router.push('/(customer)/search')}>
                <Text style={styles.seeAll}>Barchasi</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={primeStores}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => (
                <PrimeStoreCard
                  store={item}
                  onPress={() =>
                    router.push({
                      pathname: '/(customer)/store/[id]',
                      params: { id: item.id },
                    })
                  }
                />
              )}
            />
          </View>
        )}

        {/* Categories */}
        {(categories?.length ?? 0) > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kategoriyalar</Text>
            <FlatList
              data={categories}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.categoryChip}>
                  {item.image && (
                    <Image
                      source={{ uri: imageUrl(item.image)! }}
                      style={styles.categoryImage}
                    />
                  )}
                  <Text style={styles.categoryName}>{t(item.name, lang)}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* All Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Barcha mahsulotlar</Text>
          </View>

          {loadingProducts ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
          ) : (
            <View style={styles.productGrid}>
              {(productsData?.items ?? productsData ?? []).map((product: any) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  lang={lang}
                  onPress={() =>
                    router.push({
                      pathname: '/(customer)/product/[id]',
                      params: { id: product.id },
                    })
                  }
                />
              ))}
            </View>
          )}
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  greeting: { ...Typography.h4, color: Colors.white, marginBottom: 2 },
  location: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.85)',
    maxWidth: 180,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  langToggle: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    minWidth: 36,
    alignItems: 'center',
  },
  langToggleText: {
    ...Typography.buttonSmall,
    color: Colors.white,
    fontWeight: '700',
  },
  broadcastBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  broadcastBtnText: {
    ...Typography.buttonSmall,
    color: Colors.white,
  },
  scroll: { flex: 1 },
  section: { marginTop: Spacing.md, paddingHorizontal: Spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: { ...Typography.title },
  seeAll: { ...Typography.bodySmall, color: Colors.primary, fontWeight: '600' },
  horizontalList: { paddingRight: Spacing.md, gap: Spacing.sm },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    gap: Spacing.xs,
    ...Shadow.sm,
  },
  categoryImage: { width: 20, height: 20, borderRadius: 10 },
  categoryName: { ...Typography.bodySmall, fontWeight: '500' },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
});

const storeStyles = StyleSheet.create({
  card: {
    width: 220,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  banner: { width: '100%', height: 100 },
  bannerPlaceholder: {
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerEmoji: { fontSize: 36 },
  info: { padding: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  logo: { width: 36, height: 36, borderRadius: 18 },
  logoPlaceholder: {
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: { flex: 1 },
  name: { ...Typography.title, fontSize: 14 },
  tags: { flexDirection: 'row', gap: 4, marginTop: 2 },
  primeBadge: {
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  primeBadgeText: { fontSize: 10, color: '#F57F17', fontWeight: '600' },
});

const productStyles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  image: { width: '100%', height: 130 },
  imagePlaceholder: {
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { padding: Spacing.sm },
  name: { ...Typography.bodySmall, marginBottom: 4 },
  price: { ...Typography.priceSmall },
});
