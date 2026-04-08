import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, RefreshControl, Platform, Modal, Animated,
  Pressable, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { storeProductsApi, productsApi } from '../../src/api/products';
import { storesApi } from '../../src/api/stores';
import { useTranslation } from '../../src/i18n';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.yaqin-market.uz';
function imageUrl(path?: string) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_URL}/${path}`;
}

// ─── Add Product Modal ────────────────────────────────────────────────────────
function AddProductModal({
  visible, onClose, storeId,
}: {
  visible: boolean;
  onClose: () => void;
  storeId: string;
}) {
  const { lang, t } = useTranslation();
  const queryClient = useQueryClient();
  const slideY = useRef(new Animated.Value(600)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');

  const { data: catalog, isLoading } = useQuery({
    queryKey: ['product-catalog-search', query],
    queryFn: () => productsApi.getCatalog({ q: query || undefined, limit: 50 }),
    enabled: visible,
  });

  const catalogItems = Array.isArray(catalog)
    ? catalog
    : Array.isArray(catalog?.items) ? catalog.items : [];

  const addMutation = useMutation({
    mutationFn: (data: { product_id: string; price: number; stock: number }) =>
      storeProductsApi.create({ ...data, store_id: storeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-products'] });
      Alert.alert(
        lang === 'ru' ? 'Добавлено!' : "Qo'shildi!",
        lang === 'ru' ? 'Товар добавлен в ваш магазин' : "Mahsulot do'koningizga qo'shildi",
      );
      resetAndClose();
    },
    onError: (e: any) => {
      Alert.alert(
        lang === 'ru' ? 'Ошибка' : 'Xato',
        e?.response?.data?.message ?? (lang === 'ru' ? 'Произошла ошибка' : 'Xato yuz berdi'),
      );
    },
  });

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(bgOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideY, { toValue: 0, friction: 8, tension: 65, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(bgOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideY, { toValue: 600, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const resetAndClose = () => {
    setSelected(null);
    setPrice('');
    setStock('');
    setQuery('');
    onClose();
  };

  const handleAdd = () => {
    if (!selected) return;
    const p = parseFloat(price);
    if (!p || p <= 0) {
      Alert.alert(lang === 'ru' ? 'Введите цену' : 'Narx kiriting');
      return;
    }
    addMutation.mutate({
      product_id: selected.id,
      price: p,
      stock: parseInt(stock) || 0,
    });
  };

  // Step 2: price/stock form
  if (selected) {
    const img = selected.images?.[0]?.url;
    return (
      <Modal transparent visible={visible} onRequestClose={resetAndClose} animationType="none">
        <Animated.View style={[m.backdrop, { opacity: bgOpacity }]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={resetAndClose} />
        </Animated.View>
        <Animated.View style={[m.sheet, m.sheetSmall, { transform: [{ translateY: slideY }] }]}>
          <View style={m.handle} />
          <Text style={m.title}>{lang === 'ru' ? 'Установить цену' : 'Narx belgilash'}</Text>

          {/* Selected product preview */}
          <View style={m.selectedCard}>
            {img ? (
              <Image source={{ uri: imageUrl(img)! }} style={m.selectedImg} resizeMode="cover" />
            ) : (
              <View style={[m.selectedImg, { backgroundColor: Colors.primarySurface, alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="cube-outline" size={24} color={Colors.primaryLight} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={m.selectedName} numberOfLines={2}>{t(selected.name)}</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Text style={m.changeBtn}>{lang === 'ru' ? 'Изменить' : 'Almashtirish'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Price input */}
          <View style={m.inputWrap}>
            <Ionicons name="pricetag-outline" size={18} color={Colors.primary} />
            <TextInput
              style={m.input}
              placeholder={lang === 'ru' ? 'Цена (сум)' : "Narx (so'm)"}
              placeholderTextColor={Colors.textHint}
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
              autoFocus
            />
          </View>

          {/* Stock input */}
          <View style={m.inputWrap}>
            <Ionicons name="layers-outline" size={18} color={Colors.primary} />
            <TextInput
              style={m.input}
              placeholder={lang === 'ru' ? 'Количество (шт)' : 'Soni (dona)'}
              placeholderTextColor={Colors.textHint}
              keyboardType="numeric"
              value={stock}
              onChangeText={setStock}
            />
          </View>

          {/* Add button */}
          <TouchableOpacity
            style={[m.addBtn, addMutation.isPending && { opacity: 0.7 }]}
            onPress={handleAdd}
            disabled={addMutation.isPending}
            activeOpacity={0.85}
          >
            {addMutation.isPending ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
                <Text style={m.addBtnTxt}>{lang === 'ru' ? "Добавить в магазин" : "Do'konga qo'shish"}</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: Platform.OS === 'ios' ? 28 : 16 }} />
        </Animated.View>
      </Modal>
    );
  }

  // Step 1: search & select
  return (
    <Modal transparent visible={visible} onRequestClose={resetAndClose} animationType="none">
      <Animated.View style={[m.backdrop, { opacity: bgOpacity }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={resetAndClose} />
      </Animated.View>
      <Animated.View style={[m.sheet, { transform: [{ translateY: slideY }] }]}>
        <View style={m.handle} />
        <Text style={m.title}>{lang === 'ru' ? 'Выберите товар' : 'Mahsulot tanlang'}</Text>

        {/* Search */}
        <View style={m.searchBar}>
          <Ionicons name="search" size={18} color={Colors.textHint} />
          <TextInput
            style={m.searchInput}
            placeholder={lang === 'ru' ? 'Поиск товара...' : 'Mahsulot qidiring...'}
            placeholderTextColor={Colors.textHint}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textHint} />
            </TouchableOpacity>
          )}
        </View>

        {/* Catalog list */}
        {isLoading ? (
          <View style={{ paddingTop: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            data={catalogItems}
            keyExtractor={item => String(item.id)}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 32, gap: 8, paddingTop: 4 }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 40, gap: 8 }}>
                <Ionicons name="search-outline" size={40} color={Colors.textHint} />
                <Text style={{ fontSize: 14, color: Colors.textHint }}>
                  {lang === 'ru' ? 'Товары не найдены' : 'Mahsulot topilmadi'}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const img = item.images?.[0]?.url;
              return (
                <TouchableOpacity
                  style={m.catalogCard}
                  onPress={() => setSelected(item)}
                  activeOpacity={0.8}
                >
                  {img ? (
                    <Image source={{ uri: imageUrl(img)! }} style={m.catalogImg} resizeMode="cover" />
                  ) : (
                    <View style={[m.catalogImg, { backgroundColor: Colors.primarySurface, alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="cube-outline" size={22} color={Colors.primaryLight} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={m.catalogName} numberOfLines={2}>{t(item.name)}</Text>
                    {item.category?.name && (
                      <Text style={m.catalogCat}>{t(item.category.name)}</Text>
                    )}
                  </View>
                  <Ionicons name="add-circle" size={24} color={Colors.primary} />
                </TouchableOpacity>
              );
            }}
          />
        )}
      </Animated.View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SellerProductsScreen() {
  const { lang, t } = useTranslation();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const { data: myStores } = useQuery({ queryKey: ['my-stores'], queryFn: storesApi.getMyStores });
  const storeId = myStores?.[0]?.id;

  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['store-products', storeId],
    queryFn: () => storeProductsApi.getByStore(storeId!),
    enabled: !!storeId,
  });

  const items = Array.isArray(products) ? products : [];
  const activeCount = items.filter((p: any) => p.status === 'ACTIVE').length;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.title}>{lang === 'ru' ? 'Товары' : 'Mahsulotlar'}</Text>
            <Text style={s.subtitle}>
              {items.length} {lang === 'ru' ? 'шт' : 'ta'} · {activeCount} {lang === 'ru' ? 'активных' : 'faol'}
            </Text>
          </View>
          <TouchableOpacity
            style={s.addBtn}
            activeOpacity={0.85}
            onPress={() => setAddModalOpen(true)}
          >
            <Ionicons name="add" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.primary} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={s.empty}>
              <View style={s.emptyIconBox}>
                <Ionicons name="bag-outline" size={40} color={Colors.primaryLight} />
              </View>
              <Text style={s.emptyTitle}>{lang === 'ru' ? 'Нет товаров' : "Mahsulot yo'q"}</Text>
              <Text style={s.emptySub}>
                {lang === 'ru' ? 'Нажмите + чтобы добавить товар' : "Yangi mahsulot qo'shish uchun + tugmasini bosing"}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const img = item.product?.images?.[0]?.url;
          const isActive = item.status === 'ACTIVE';
          return (
            <TouchableOpacity style={s.card} activeOpacity={0.88}>
              {img ? (
                <Image source={{ uri: imageUrl(img)! }} style={s.image} resizeMode="cover" />
              ) : (
                <View style={[s.image, s.imagePlaceholder]}>
                  <Ionicons name="cube-outline" size={28} color={Colors.primaryLight} />
                </View>
              )}
              <View style={s.info}>
                <Text style={s.name} numberOfLines={2}>{t(item.product?.name)}</Text>
                <Text style={s.price}>{Number(item.price).toLocaleString()} {lang === 'ru' ? 'сум' : "so'm"}</Text>
                <View style={s.bottomRow}>
                  <View style={s.stockPill}>
                    <Ionicons name="layers-outline" size={12} color={Colors.textHint} />
                    <Text style={s.stockTxt}>{item.stock} {lang === 'ru' ? 'шт' : 'ta'}</Text>
                  </View>
                  <View style={[s.statusPill, { backgroundColor: isActive ? '#E8F5E9' : '#FFEBEE' }]}>
                    <View style={[s.statusDot, { backgroundColor: isActive ? Colors.success : Colors.error }]} />
                    <Text style={[s.statusTxt, { color: isActive ? Colors.success : Colors.error }]}>
                      {isActive ? (lang === 'ru' ? 'Актив' : 'Faol') : (lang === 'ru' ? 'Неактив' : 'Nofaol')}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={s.editBtn} activeOpacity={0.7}>
                <Ionicons name="ellipsis-vertical" size={16} color={Colors.textHint} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />

      {/* Add product modal */}
      {storeId && (
        <AddProductModal
          visible={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          storeId={storeId}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'android' ? Spacing.xs : 0,
    paddingBottom: Spacing.md,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  title: { fontSize: 22, fontWeight: '800', color: Colors.white },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  addBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 100 },
  card: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    flexDirection: 'row', ...Shadow.sm, overflow: 'hidden',
  },
  image: { width: 88, height: 88, backgroundColor: Colors.background },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, padding: Spacing.sm, justifyContent: 'space-between' },
  name: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary, lineHeight: 18 },
  price: { fontSize: 15, fontWeight: '800', color: Colors.primary, marginVertical: 3 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stockPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.background,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radius.full,
  },
  stockTxt: { fontSize: 11, color: Colors.textHint, fontWeight: '500' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusTxt: { fontSize: 11, fontWeight: '600' },
  editBtn: { width: 40, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyIconBox: { width: 80, height: 80, borderRadius: 24, backgroundColor: Colors.primarySurface, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: 13, color: Colors.textHint, textAlign: 'center', paddingHorizontal: 40, lineHeight: 19 },
});

const m = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingHorizontal: Spacing.md,
    maxHeight: '85%', ...Shadow.lg,
  },
  sheetSmall: { maxHeight: undefined },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.divider,
    alignSelf: 'center', marginBottom: Spacing.md,
  },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: Radius.lg, paddingHorizontal: Spacing.md, height: 46,
    marginBottom: Spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  catalogCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.sm, ...Shadow.sm,
  },
  catalogImg: { width: 52, height: 52, borderRadius: Radius.md, backgroundColor: Colors.background },
  catalogName: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary, lineHeight: 19 },
  catalogCat: { fontSize: 11, color: Colors.textHint, marginTop: 2 },
  selectedCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.primarySurface, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  selectedImg: { width: 56, height: 56, borderRadius: Radius.md },
  selectedName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, lineHeight: 20 },
  changeBtn: { fontSize: 12, color: Colors.primary, fontWeight: '600', marginTop: 4 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: Radius.lg, paddingHorizontal: Spacing.md, height: 52,
    marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  input: { flex: 1, fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 15, borderRadius: Radius.lg,
    marginTop: Spacing.sm, ...Shadow.md,
  },
  addBtnTxt: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
