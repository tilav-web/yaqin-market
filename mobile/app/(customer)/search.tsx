import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, TextInput, ActivityIndicator, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { productsApi, categoriesApi } from '../../src/api/products';
import { useCartStore } from '../../src/store/cart.store';
import { useSearchHistory } from '../../src/store/search-history.store';
import { useTranslation } from '../../src/i18n';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
function imageUrl(path?: string) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_URL}/${path}`;
}

export default function SearchScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const { lang, t, tr } = useTranslation();
  const { addBroadcastItem } = useCartStore();
  const { history, addSearch, removeSearch, clearAll } = useSearchHistory();

  // Categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
  });

  // Ko'p qidiriladigan mahsulotlar (top from catalog)
  const { data: trendingData } = useQuery({
    queryKey: ['trending-products'],
    queryFn: () => productsApi.getCatalog({ limit: 6 }),
    enabled: query.length === 0,
  });
  const trendingProducts = Array.isArray(trendingData)
    ? trendingData
    : Array.isArray(trendingData?.items) ? trendingData.items : [];

  // Search results
  const { data, isLoading } = useQuery({
    queryKey: ['search-products', query, selectedCat],
    queryFn: () => productsApi.getCatalog({
      q: query || undefined,
      category_id: selectedCat ? Number(selectedCat) : undefined,
      limit: 30,
    }),
    enabled: query.length >= 1 || selectedCat.length > 0,
  });

  const products = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  const showResults = query.length > 0 || selectedCat.length > 0;
  const showEmpty = showResults && !isLoading && products.length === 0;

  const handleSearch = (text: string) => {
    setQuery(text);
    if (text.trim().length >= 2) {
      addSearch(text.trim());
    }
  };

  const pickRecent = (term: string) => {
    setQuery(term);
    addSearch(term);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.searchRow}>
          <View style={s.searchBox}>
            <Ionicons name="search" size={18} color={Colors.textHint} />
            <TextInput
              ref={inputRef}
              style={s.input}
              value={query}
              onChangeText={handleSearch}
              placeholder={tr('search_placeholder')}
              placeholderTextColor={Colors.textHint}
              autoFocus
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => { setQuery(''); setSelectedCat(''); }}>
                <Ionicons name="close-circle" size={18} color={Colors.textHint} />
              </TouchableOpacity>
            )}
          </View>
          {(query.length > 0 || selectedCat) && (
            <TouchableOpacity onPress={() => { setQuery(''); setSelectedCat(''); }} style={s.cancelBtn}>
              <Text style={s.cancelTxt}>{tr('cancel')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Category chips */}
        {(categories?.length ?? 0) > 0 && (
          <FlatList
            data={categories}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={i => String(i.id)}
            contentContainerStyle={s.chips}
            renderItem={({ item }) => {
              const active = selectedCat === String(item.id);
              return (
                <TouchableOpacity
                  style={[s.chip, active && s.chipActive]}
                  onPress={() => setSelectedCat(active ? '' : String(item.id))}
                >
                  <Text style={[s.chipTxt, active && s.chipTxtActive]}>
                    {t(item.name)}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      {/* ── Body ── */}
      {!showResults ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}>
          {/* Oxirgi qidiruvlar */}
          {history.length > 0 && (
            <>
              <View style={s.sectionRow}>
                <Text style={s.suggTitle}>{tr('recent_searches')}</Text>
                <TouchableOpacity onPress={clearAll}>
                  <Text style={s.clearTxt}>{lang === 'ru' ? 'Очистить' : 'Tozalash'}</Text>
                </TouchableOpacity>
              </View>
              <View style={s.recentRow}>
                {history.slice(0, 15).map(term => (
                  <TouchableOpacity key={term} style={s.recentChip} onPress={() => pickRecent(term)}>
                    <Ionicons name="time-outline" size={13} color={Colors.textHint} />
                    <Text style={s.recentTxt}>{term}</Text>
                    <TouchableOpacity hitSlop={8} onPress={() => removeSearch(term)}>
                      <Ionicons name="close" size={12} color={Colors.textHint} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Ko'p qidiriladigan mahsulotlar */}
          <Text style={[s.suggTitle, { marginTop: Spacing.lg }]}>
            {lang === 'ru' ? 'Популярные товары' : 'Ko\'p qidiriladigan mahsulotlar'}
          </Text>
          <View style={s.trendGrid}>
            {trendingProducts.map((item: any) => {
              const img = item.images?.[0]?.url;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={s.trendCard}
                  onPress={() => router.push({ pathname: '/(customer)/product/[id]', params: { id: item.id } })}
                  activeOpacity={0.85}
                >
                  {img ? (
                    <Image source={{ uri: imageUrl(img)! }} style={s.trendImg} resizeMode="cover" />
                  ) : (
                    <View style={[s.trendImg, { backgroundColor: Colors.primarySurface, alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="cube-outline" size={22} color={Colors.primaryLight} />
                    </View>
                  )}
                  <Text style={s.trendName} numberOfLines={2}>{t(item.name)}</Text>
                  {item.store_products?.[0]?.price != null && (
                    <Text style={s.trendPrice}>{Number(item.store_products[0].price).toLocaleString()} so'm</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      ) : isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : showEmpty ? (
        <View style={s.center}>
          <Ionicons name="search-outline" size={48} color={Colors.textHint} />
          <Text style={s.emptyTitle}>"{query}" {tr('no_results')}</Text>
          <Text style={s.emptySub}>{lang === 'ru' ? 'Попробуйте другое слово' : "Boshqa so'z bilan qidiring"}</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.list}
          numColumns={2}
          columnWrapperStyle={{ gap: Spacing.sm }}
          renderItem={({ item }) => {
            const img = item.images?.[0]?.url;
            const price = item.store_products?.[0]?.price;
            return (
              <TouchableOpacity
                style={s.card}
                activeOpacity={0.88}
                onPress={() => router.push({ pathname: '/(customer)/product/[id]', params: { id: item.id } })}
              >
                {img ? (
                  <Image source={{ uri: imageUrl(img)! }} style={s.cardImg} resizeMode="cover" />
                ) : (
                  <View style={[s.cardImg, s.cardPlaceholder]}>
                    <Ionicons name="cube-outline" size={32} color={Colors.primaryLight} />
                  </View>
                )}
                <View style={s.cardBody}>
                  <Text style={s.cardName} numberOfLines={2}>{t(item.name)}</Text>
                  {price != null && (
                    <Text style={s.cardPrice}>{Number(price).toLocaleString()} so'm</Text>
                  )}
                  <TouchableOpacity
                    style={s.addBtn}
                    onPress={() => addBroadcastItem({
                      product_id: item.id,
                      product_name: item.name,
                      product_image: img,
                      quantity: 1,
                    })}
                  >
                    <Ionicons name="add" size={16} color={Colors.white} />
                    <Text style={s.addTxt}>{tr('add_to_cart')}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
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
    gap: Spacing.sm,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, height: 44, gap: Spacing.sm, ...Shadow.sm,
  },
  input: { flex: 1, fontSize: 14, color: Colors.textPrimary, paddingVertical: 0 },
  cancelBtn: { paddingHorizontal: 4 },
  cancelTxt: { fontSize: 14, fontWeight: '600', color: Colors.white },

  chips: { gap: Spacing.xs, paddingBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: 'rgba(255,255,255,0.2)' },
  chipActive: { backgroundColor: Colors.white },
  chipTxt: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  chipTxtActive: { color: Colors.primary },

  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  suggTitle: { fontSize: 13, fontWeight: '700', color: Colors.textHint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm },
  clearTxt: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  recentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  recentChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.white, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.full, ...Shadow.sm,
  },
  recentTxt: { fontSize: 13, color: Colors.textSecondary },

  trendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  trendCard: {
    width: '30%', backgroundColor: Colors.white,
    borderRadius: Radius.lg, overflow: 'hidden', ...Shadow.sm,
  },
  trendImg: { width: '100%', height: 80, backgroundColor: Colors.background },
  trendName: { fontSize: 11, fontWeight: '500', color: Colors.textPrimary, paddingHorizontal: 6, paddingTop: 4, lineHeight: 15 },
  trendPrice: { fontSize: 11, fontWeight: '700', color: Colors.primary, paddingHorizontal: 6, paddingBottom: 6 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: 13, color: Colors.textHint, textAlign: 'center', paddingHorizontal: Spacing.xl },

  list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 100 },
  card: { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.lg, overflow: 'hidden', ...Shadow.sm },
  cardImg: { width: '100%', height: 120, backgroundColor: Colors.background },
  cardPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: Spacing.sm, gap: 4 },
  cardName: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary, lineHeight: 17 },
  cardPrice: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 6, marginTop: 2,
  },
  addTxt: { fontSize: 12, fontWeight: '700', color: Colors.white },
});
