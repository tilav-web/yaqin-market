import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { productsApi } from '../../src/api/products';
import { useCartStore } from '../../src/store/cart.store';
import { useTranslation } from '../../src/i18n';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
function imageUrl(path?: string) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_URL}/${path}`;
}

const RECENT = ['Tuxum', 'Non', 'Yogʻ', 'Sabzi'];

export default function SearchScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const { lang, t, tr } = useTranslation();
  const { addBroadcastItem } = useCartStore();

  const FILTER_CHIPS = [
    { label: lang === 'ru' ? 'Все' : 'Barchasi', value: '' },
    { label: lang === 'ru' ? 'Продукты' : 'Oziq-ovqat', value: 'food' },
    { label: lang === 'ru' ? 'Напитки' : 'Ichimliklar', value: 'drinks' },
    { label: lang === 'ru' ? 'Сладости' : 'Shirinliklar', value: 'sweets' },
  ];

  const { data, isLoading } = useQuery({
    queryKey: ['search-products', query],
    queryFn: () => productsApi.getCatalog({ q: query, limit: 30 }),
    enabled: query.length >= 1,
  });

  const products = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  const showEmpty = query.length > 0 && !isLoading && products.length === 0;

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
              onChangeText={setQuery}
              placeholder={tr('search_placeholder')}
              placeholderTextColor={Colors.textHint}
              autoFocus
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={18} color={Colors.textHint} />
              </TouchableOpacity>
            )}
          </View>
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={s.cancelBtn}>
              <Text style={s.cancelTxt}>{tr('cancel')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter chips */}
        <FlatList
          data={FILTER_CHIPS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={i => i.value}
          contentContainerStyle={s.chips}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.chip, filter === item.value && s.chipActive]}
              onPress={() => setFilter(item.value)}
            >
              <Text style={[s.chipTxt, filter === item.value && s.chipTxtActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* ── Body ── */}
      {query.length === 0 ? (
        // Recent / suggestions
        <View style={s.suggestions}>
          <Text style={s.suggTitle}>{tr('recent_searches')}</Text>
          <View style={s.recentRow}>
            {RECENT.map(r => (
              <TouchableOpacity key={r} style={s.recentChip} onPress={() => setQuery(r)}>
                <Ionicons name="time-outline" size={13} color={Colors.textHint} />
                <Text style={s.recentTxt}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[s.suggTitle, { marginTop: Spacing.lg }]}>{lang === 'ru' ? 'Популярные категории' : 'Mashhur kategoriyalar'}</Text>
          <View style={s.catGrid}>
            {[
              { icon: '🥦', label: lang === 'ru' ? 'Овощи' : 'Sabzavot' },
              { icon: '🍎', label: lang === 'ru' ? 'Фрукты' : 'Meva' },
              { icon: '🥛', label: lang === 'ru' ? 'Молочные' : 'Sut mahsuloti' },
              { icon: '🍞', label: lang === 'ru' ? 'Хлеб' : 'Non-bulka' },
              { icon: '🥩', label: lang === 'ru' ? 'Мясо' : 'Go\'sht' },
              { icon: '🍬', label: lang === 'ru' ? 'Сладости' : 'Shirinlik' },
            ].map(c => (
              <TouchableOpacity key={c.label} style={s.catCard} onPress={() => setQuery(c.label)}>
                <Text style={{ fontSize: 28 }}>{c.icon}</Text>
                <Text style={s.catLabel}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={s.loadingTxt}>{tr('loading')}...</Text>
        </View>
      ) : showEmpty ? (
        <View style={s.center}>
          <Text style={{ fontSize: 52 }}>🔍</Text>
          <Text style={s.emptyTitle}>"{query}" {tr('no_results')}</Text>
          <Text style={s.emptySub}>{lang === 'ru' ? 'Попробуйте другое слово' : "Boshqa so'z bilan qayta urinib ko'ring"}</Text>
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
                onPress={() =>
                  router.push({ pathname: '/(customer)/product/[id]', params: { id: item.id } })
                }
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
                    onPress={() =>
                      addBroadcastItem({
                        product_id: item.id,
                        product_name: item.name,
                        product_image: img,
                        quantity: 1,
                      })
                    }
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    height: 44,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  input: { flex: 1, fontSize: 14, color: Colors.textPrimary, paddingVertical: 0 },
  cancelBtn: { paddingHorizontal: 4 },
  cancelTxt: { fontSize: 14, fontWeight: '600', color: Colors.white },

  chips: { gap: Spacing.xs, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  chipActive: { backgroundColor: Colors.white },
  chipTxt: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  chipTxtActive: { color: Colors.primary },

  suggestions: { flex: 1, padding: Spacing.md },
  suggTitle: { fontSize: 13, fontWeight: '700', color: Colors.textHint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm },
  recentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  recentChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.white, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.full, ...Shadow.sm,
  },
  recentTxt: { fontSize: 13, color: Colors.textSecondary },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  catCard: {
    width: '30%',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
    ...Shadow.sm,
  },
  catLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  loadingTxt: { fontSize: 14, color: Colors.textHint },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: 13, color: Colors.textHint, textAlign: 'center', paddingHorizontal: Spacing.xl },

  list: { padding: Spacing.md, gap: Spacing.sm },
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  cardImg: { width: '100%', height: 120, backgroundColor: Colors.background },
  cardPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: Spacing.sm, gap: 4 },
  cardName: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary, lineHeight: 17 },
  cardPrice: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 6,
    marginTop: 2,
  },
  addTxt: { fontSize: 12, fontWeight: '700', color: Colors.white },
});
