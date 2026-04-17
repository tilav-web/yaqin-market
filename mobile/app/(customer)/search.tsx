import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, TextInput, ActivityIndicator, Platform, ScrollView,
  Modal, Animated, Pressable, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { productsApi, categoriesApi } from '../../src/api/products';
import { useSearchHistory } from '../../src/store/search-history.store';
import { useLocationStore } from '../../src/store/location.store';
import { useTranslation } from '../../src/i18n';
import ProductDetailSheet from '../../src/components/product/ProductDetailSheet';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const PAGE_SIZE = 16;

function imageUrl(path?: string) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_URL}/${path}`;
}

type SortKey = 'price_asc' | 'price_desc' | null;

const SORT_OPTIONS: {
  key: NonNullable<SortKey>;
  label_uz: string;
  label_ru: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { key: 'price_asc',  label_uz: 'Arzon',  label_ru: 'Дешевле',  icon: 'trending-down-outline' },
  { key: 'price_desc', label_uz: 'Qimmat', label_ru: 'Дороже',   icon: 'trending-up-outline' },
];

// ─── Filter Sheet ──────────────────────────────────────────────────────────────
interface FilterState {
  priceMin: string;
  priceMax: string;
  sort: SortKey;
  deliverableOnly: boolean;
  freeDeliveryOnly: boolean;
}

const DEFAULT_FILTERS: FilterState = {
  priceMin: '',
  priceMax: '',
  sort: null,
  deliverableOnly: false,
  freeDeliveryOnly: false,
};

function FilterSheet({
  visible, onClose, filters, onApply, lang,
}: {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (f: FilterState) => void;
  lang: 'uz' | 'ru';
}) {
  const slideY = useRef(new Animated.Value(800)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const [draft, setDraft] = useState<FilterState>(filters);

  useEffect(() => {
    if (visible) {
      setDraft(filters);
      Animated.parallel([
        Animated.timing(bgOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideY, { toValue: 0, friction: 9, tension: 80, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(bgOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideY, { toValue: 800, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const reset = () => setDraft(DEFAULT_FILTERS);
  const apply = () => { onApply(draft); onClose(); };

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      <Animated.View style={[fs.backdrop, { opacity: bgOpacity }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[fs.sheet, { transform: [{ translateY: slideY }] }]}>
        <View style={fs.handle} />
        <View style={fs.headerRow}>
          <Text style={fs.title}>{lang === 'ru' ? 'Фильтры' : 'Filterlar'}</Text>
          <TouchableOpacity onPress={reset}>
            <Text style={fs.resetTxt}>{lang === 'ru' ? 'Сбросить' : 'Tozalash'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
          {/* Sort by price */}
          <Text style={fs.sectionLabel}>{lang === 'ru' ? 'Сортировка по цене' : 'Narx bo\'yicha saralash'}</Text>
          <View style={fs.sortGrid}>
            {SORT_OPTIONS.map((opt) => {
              const active = draft.sort === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[fs.sortBtn, active && fs.sortBtnActive]}
                  onPress={() =>
                    setDraft(d => ({ ...d, sort: active ? null : opt.key }))
                  }
                  activeOpacity={0.85}
                >
                  <View style={[fs.sortIconBox, active && fs.sortIconBoxActive]}>
                    <Ionicons
                      name={opt.icon}
                      size={20}
                      color={active ? Colors.white : Colors.primary}
                    />
                  </View>
                  <Text style={[fs.sortTxt, active && fs.sortTxtActive]}>
                    {lang === 'ru' ? opt.label_ru : opt.label_uz}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Price */}
          <Text style={fs.sectionLabel}>{lang === 'ru' ? 'Цена (сум)' : "Narx (so'm)"}</Text>
          <View style={fs.priceRow}>
            <View style={fs.priceBox}>
              <Text style={fs.priceLabel}>{lang === 'ru' ? 'от' : 'dan'}</Text>
              <TextInput
                style={fs.priceInput}
                value={draft.priceMin}
                onChangeText={(v) => setDraft(d => ({ ...d, priceMin: v.replace(/[^0-9]/g, '') }))}
                placeholder="0"
                placeholderTextColor={Colors.textHint}
                keyboardType="number-pad"
              />
            </View>
            <View style={fs.priceBox}>
              <Text style={fs.priceLabel}>{lang === 'ru' ? 'до' : 'gacha'}</Text>
              <TextInput
                style={fs.priceInput}
                value={draft.priceMax}
                onChangeText={(v) => setDraft(d => ({ ...d, priceMax: v.replace(/[^0-9]/g, '') }))}
                placeholder="∞"
                placeholderTextColor={Colors.textHint}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Deliverable toggle — free delivery bilan birga yoqilsa bir-birini o'chiradi */}
          <TouchableOpacity
            style={fs.toggleRow}
            onPress={() =>
              setDraft(d => ({
                ...d,
                deliverableOnly: !d.deliverableOnly,
                freeDeliveryOnly: !d.deliverableOnly ? false : d.freeDeliveryOnly,
              }))
            }
            activeOpacity={0.8}
          >
            <View style={[fs.toggleIcon, { backgroundColor: '#FBE9E7' }]}>
              <Ionicons name="bicycle-outline" size={18} color="#FF5722" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={fs.toggleLabel}>{lang === 'ru' ? 'Доставляют мне' : "Menga yetkazadiganlar"}</Text>
              <Text style={fs.toggleSub}>{lang === 'ru' ? 'Магазины в зоне доставки' : "Do'kon xizmat radiusi ichiga kirasiz"}</Text>
            </View>
            <View style={[fs.switch, draft.deliverableOnly && fs.switchActive]}>
              <View style={[fs.switchDot, draft.deliverableOnly && fs.switchDotActive]} />
            </View>
          </TouchableOpacity>

          {/* Free delivery toggle — yoqilsa deliverable'ni avtomatik o'chiradi (tekin ⊂ yetkazadigan) */}
          <TouchableOpacity
            style={fs.toggleRow}
            onPress={() =>
              setDraft(d => ({
                ...d,
                freeDeliveryOnly: !d.freeDeliveryOnly,
                deliverableOnly: !d.freeDeliveryOnly ? false : d.deliverableOnly,
              }))
            }
            activeOpacity={0.8}
          >
            <View style={[fs.toggleIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="gift-outline" size={18} color={Colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={fs.toggleLabel}>{lang === 'ru' ? 'Бесплатная доставка' : "Tekin yetkazib berish"}</Text>
              <Text style={fs.toggleSub}>{lang === 'ru' ? 'Доставляют бесплатно к вам' : "Sizga tekin yetkazib beriladi"}</Text>
            </View>
            <View style={[fs.switch, draft.freeDeliveryOnly && fs.switchActive]}>
              <View style={[fs.switchDot, draft.freeDeliveryOnly && fs.switchDotActive]} />
            </View>
          </TouchableOpacity>

          <View style={{ height: Spacing.md }} />
        </ScrollView>

        <View style={fs.applyBar}>
          <TouchableOpacity style={fs.applyBtn} onPress={apply} activeOpacity={0.88}>
            <Text style={fs.applyTxt}>{lang === 'ru' ? 'Применить' : 'Qo\'llash'}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

// ─── Search Screen ─────────────────────────────────────────────────────────────
export default function SearchScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  const { lang, t, tr } = useTranslation();
  const { history, addSearch, removeSearch, clearAll } = useSearchHistory();
  const { lat, lng } = useLocationStore();

  // Debounce search input
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(id);
  }, [query]);

  // Save to history when user types meaningful query
  useEffect(() => {
    if (debounced.length >= 2) addSearch(debounced);
  }, [debounced]);

  // Categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
  });

  // Active filters count
  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (filters.priceMin) c++;
    if (filters.priceMax) c++;
    if (filters.sort) c++;
    if (filters.deliverableOnly) c++;
    if (filters.freeDeliveryOnly) c++;
    return c;
  }, [filters]);

  const hasAnyFilter =
    debounced.length > 0 || selectedCat.length > 0 || activeFilterCount > 0;

  // Search results (paginated)
  const {
    data: pages,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['search', debounced, selectedCat, filters, lat, lng],
    enabled: hasAnyFilter,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      // Delivery filterlar user lokatsiyasini talab qiladi
      const needsLocation = filters.deliverableOnly || filters.freeDeliveryOnly;
      const useLat = needsLocation && lat != null ? lat : undefined;
      const useLng = needsLocation && lng != null ? lng : undefined;

      const res = await productsApi.getCatalog({
        q: debounced || undefined,
        category_id: selectedCat || undefined,
        sort: filters.sort ?? undefined,
        price_min: filters.priceMin ? Number(filters.priceMin) : undefined,
        price_max: filters.priceMax ? Number(filters.priceMax) : undefined,
        lat: useLat,
        lng: useLng,
        deliverable: filters.deliverableOnly || undefined,
        free_delivery: filters.freeDeliveryOnly || undefined,
        page: pageParam as number,
        limit: PAGE_SIZE,
      });
      return res;
    },
    getNextPageParam: (last: any) => last?.meta?.hasMore ? last.meta.page + 1 : undefined,
  });

  const products = useMemo(
    () => pages?.pages.flatMap((p: any) => Array.isArray(p) ? p : p?.items ?? []) ?? [],
    [pages],
  );

  const clearAllFilters = () => {
    setQuery('');
    setDebounced('');
    setSelectedCat('');
    setFilters(DEFAULT_FILTERS);
  };

  const removeFilter = (key: 'cat' | 'price' | 'sort' | 'deliverable' | 'freeDelivery') => {
    if (key === 'cat') setSelectedCat('');
    else if (key === 'price') setFilters(f => ({ ...f, priceMin: '', priceMax: '' }));
    else if (key === 'sort') setFilters(f => ({ ...f, sort: null }));
    else if (key === 'deliverable') setFilters(f => ({ ...f, deliverableOnly: false }));
    else if (key === 'freeDelivery') setFilters(f => ({ ...f, freeDeliveryOnly: false }));
  };

  // Active chips list
  const activeChips: { key: string; label: string; onRemove: () => void }[] = [];
  if (selectedCat) {
    const cat = categories?.find((c: any) => String(c.id) === selectedCat);
    activeChips.push({
      key: 'cat',
      label: cat ? t(cat.name) : 'Kategoriya',
      onRemove: () => removeFilter('cat'),
    });
  }
  if (filters.priceMin || filters.priceMax) {
    const lo = filters.priceMin ? Number(filters.priceMin).toLocaleString() : '0';
    const hi = filters.priceMax ? Number(filters.priceMax).toLocaleString() : '∞';
    activeChips.push({
      key: 'price',
      label: `${lo} – ${hi}`,
      onRemove: () => removeFilter('price'),
    });
  }
  if (filters.sort) {
    const so = SORT_OPTIONS.find(s => s.key === filters.sort);
    activeChips.push({
      key: 'sort',
      label: so ? (lang === 'ru' ? so.label_ru : so.label_uz) : '',
      onRemove: () => removeFilter('sort'),
    });
  }
  if (filters.deliverableOnly) {
    activeChips.push({
      key: 'deliverable',
      label: lang === 'ru' ? 'Доставляют' : 'Yetkazadilar',
      onRemove: () => removeFilter('deliverable'),
    });
  }
  if (filters.freeDeliveryOnly) {
    activeChips.push({
      key: 'freeDelivery',
      label: lang === 'ru' ? 'Бесплатно' : 'Tekin',
      onRemove: () => removeFilter('freeDelivery'),
    });
  }

  const renderProduct = ({ item }: { item: any }) => {
    const img = item.images?.[0]?.url;
    const price = item.storeProducts?.[0]?.price;
    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => setSelectedProductId(item.id)}
        activeOpacity={0.88}
      >
        {img ? (
          <Image source={{ uri: imageUrl(img)! }} style={s.cardImg} resizeMode="cover" />
        ) : (
          <View style={[s.cardImg, { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primarySurface }]}>
            <Ionicons name="cube-outline" size={32} color={Colors.primaryLight} />
          </View>
        )}
        <View style={s.cardInfo}>
          <Text style={s.cardName} numberOfLines={2}>{t(item.name)}</Text>
          {price != null && (
            <Text style={s.cardPrice}>{Number(price).toLocaleString()} so'm</Text>
          )}
        </View>
        <View style={s.cardAddBtn}>
          <Ionicons name="add" size={16} color={Colors.white} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
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
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={18} color={Colors.textHint} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={s.filterBtn}
            onPress={() => setFilterOpen(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="options-outline" size={20} color={Colors.primary} />
            {activeFilterCount > 0 && (
              <View style={s.filterBadge}>
                <Text style={s.filterBadgeTxt}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Category chips */}
        {(categories?.length ?? 0) > 0 && (
          <FlatList
            data={categories}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(i) => String(i.id)}
            contentContainerStyle={s.chips}
            renderItem={({ item }) => {
              const active = selectedCat === String(item.id);
              return (
                <TouchableOpacity
                  style={[s.chip, active && s.chipActive]}
                  onPress={() => setSelectedCat(active ? '' : String(item.id))}
                >
                  <Text style={[s.chipTxt, active && s.chipTxtActive]}>{t(item.name)}</Text>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <View style={s.activeBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: Spacing.md }}>
            {activeChips.map((c) => (
              <TouchableOpacity key={c.key} style={s.activeChip} onPress={c.onRemove} activeOpacity={0.8}>
                <Text style={s.activeChipTxt}>{c.label}</Text>
                <Ionicons name="close" size={12} color={Colors.primary} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.clearAllBtn} onPress={clearAllFilters}>
              <Text style={s.clearAllTxt}>{lang === 'ru' ? 'Очистить всё' : 'Hammasini tozalash'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Body */}
      {!hasAnyFilter ? (
        <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 120 }}>
          {history.length > 0 ? (
            <>
              <View style={s.sectionRow}>
                <Text style={s.suggTitle}>{tr('recent_searches')}</Text>
                <TouchableOpacity onPress={clearAll}>
                  <Text style={s.clearTxt}>{lang === 'ru' ? 'Очистить' : 'Tozalash'}</Text>
                </TouchableOpacity>
              </View>
              <View style={s.recentRow}>
                {history.slice(0, 20).map((term) => (
                  <TouchableOpacity
                    key={term}
                    style={s.recentChip}
                    onPress={() => setQuery(term)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="time-outline" size={13} color={Colors.textHint} />
                    <Text style={s.recentTxt} numberOfLines={1}>{term}</Text>
                    <TouchableOpacity hitSlop={8} onPress={() => removeSearch(term)}>
                      <Ionicons name="close" size={12} color={Colors.textHint} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <View style={s.hintWrap}>
              <View style={s.hintIconBox}>
                <Ionicons name="search-outline" size={36} color={Colors.primary} />
              </View>
              <Text style={s.hintTitle}>{lang === 'ru' ? 'Найдите нужный товар' : 'Kerakli mahsulotni toping'}</Text>
              <Text style={s.hintSub}>
                {lang === 'ru'
                  ? 'Используйте поиск, категории и фильтры'
                  : 'Qidiruv, kategoriya va filterlardan foydalaning'}
              </Text>
            </View>
          )}
        </ScrollView>
      ) : isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : products.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIconBox}>
            <Ionicons name="file-tray-outline" size={36} color={Colors.primaryLight} />
          </View>
          <Text style={s.emptyTitle}>{tr('no_results')}</Text>
          <Text style={s.emptySub}>
            {lang === 'ru' ? 'Попробуйте изменить фильтры' : "Filterlarni o'zgartirib ko'ring"}
          </Text>
          <TouchableOpacity style={s.resetBtn} onPress={clearAllFilters} activeOpacity={0.85}>
            <Text style={s.resetBtnTxt}>{lang === 'ru' ? 'Сбросить' : 'Tozalash'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item, idx) => `${item.id}-${idx}`}
          numColumns={2}
          columnWrapperStyle={{ gap: Spacing.sm, paddingHorizontal: Spacing.md }}
          contentContainerStyle={s.list}
          renderItem={renderProduct}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
          ListHeaderComponent={<View style={{ height: Spacing.sm }} />}
          ListFooterComponent={
            <View style={{ padding: Spacing.md, alignItems: 'center' }}>
              {isFetchingNextPage && <ActivityIndicator color={Colors.primary} />}
              <View style={{ height: 80 }} />
            </View>
          }
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
        />
      )}

      <FilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onApply={setFilters}
        lang={lang}
      />

      <ProductDetailSheet
        productId={selectedProductId}
        onClose={() => setSelectedProductId(null)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },

  header: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'android' ? Spacing.xs : 0,
    paddingBottom: Spacing.sm,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.white, borderRadius: Radius.lg, height: 44,
    paddingHorizontal: Spacing.md, ...Shadow.sm,
  },
  input: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  filterBtn: {
    width: 44, height: 44, borderRadius: Radius.lg,
    backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center',
    ...Shadow.sm,
  },
  filterBadge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2, borderColor: Colors.white,
  },
  filterBadgeTxt: { fontSize: 10, fontWeight: '800', color: Colors.white },

  chips: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)',
  },
  chipActive: { backgroundColor: Colors.white, borderColor: Colors.white },
  chipTxt: { fontSize: 12, fontWeight: '600', color: Colors.white },
  chipTxtActive: { color: Colors.primary },

  activeBar: {
    backgroundColor: Colors.background,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  activeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primarySurface,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.primaryLight,
  },
  activeChipTxt: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  clearAllBtn: { paddingHorizontal: 10, justifyContent: 'center' },
  clearAllTxt: { fontSize: 12, fontWeight: '600', color: Colors.textHint },

  // Body / list
  center: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.lg },
  list: { flexGrow: 1, backgroundColor: Colors.background, paddingBottom: 120 },

  // Product card
  card: {
    flex: 1, backgroundColor: Colors.white, borderRadius: Radius.lg,
    overflow: 'hidden', ...Shadow.sm,
  },
  cardImg: { width: '100%', height: 130, backgroundColor: Colors.background },
  cardInfo: { padding: Spacing.sm, gap: 4, paddingBottom: 12 },
  cardName: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary, lineHeight: 17 },
  cardPrice: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  cardAddBtn: {
    position: 'absolute', bottom: 10, right: 10,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.sm,
  },

  // Empty / hint
  emptyIconBox: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: 13, color: Colors.textHint, textAlign: 'center' },
  resetBtn: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl, paddingVertical: 11,
    borderRadius: Radius.full, ...Shadow.sm,
  },
  resetBtnTxt: { fontSize: 14, fontWeight: '700', color: Colors.white },

  hintWrap: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm, marginTop: 40 },
  hintIconBox: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  hintTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginTop: Spacing.sm },
  hintSub: { fontSize: 13, color: Colors.textHint, textAlign: 'center', lineHeight: 19 },

  // Recent searches
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  suggTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  clearTxt: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  recentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recentChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.white, paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.divider,
    maxWidth: 200,
  },
  recentTxt: { fontSize: 12, color: Colors.textPrimary, fontWeight: '500' },
});

// ─── FilterSheet styles ────────────────────────────────────────────────────────
const fs = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    ...Shadow.lg,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.divider, alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.md, paddingHorizontal: 4,
  },
  title: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  resetTxt: { fontSize: 14, fontWeight: '600', color: Colors.primary },

  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: Colors.textHint,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: Spacing.sm, marginBottom: 10, paddingLeft: 4,
  },

  sortGrid: { flexDirection: 'row', gap: Spacing.sm },
  sortBtn: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.divider,
  },
  sortBtnActive: {
    backgroundColor: Colors.primarySurface,
    borderColor: Colors.primary,
  },
  sortIconBox: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.divider,
  },
  sortIconBoxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  sortTxt: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  sortTxtActive: { color: Colors.primary },

  priceRow: { flexDirection: 'row', gap: Spacing.sm },
  priceBox: {
    flex: 1, backgroundColor: Colors.background,
    borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.divider,
  },
  priceLabel: { fontSize: 11, color: Colors.textHint, fontWeight: '600' },
  priceInput: { fontSize: 15, color: Colors.textPrimary, fontWeight: '600', paddingVertical: 2 },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: 8,
  },
  toggleIcon: {
    width: 36, height: 36, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  toggleSub: { fontSize: 11, color: Colors.textHint, marginTop: 2 },
  switch: {
    width: 44, height: 26, borderRadius: 13,
    backgroundColor: Colors.divider,
    padding: 3, justifyContent: 'center',
  },
  switchActive: { backgroundColor: Colors.primary },
  switchDot: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.white, ...Shadow.sm,
  },
  switchDotActive: { alignSelf: 'flex-end' },


  applyBar: { marginTop: Spacing.sm },
  applyBtn: {
    backgroundColor: Colors.primary,
    height: 52, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.md,
  },
  applyTxt: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
