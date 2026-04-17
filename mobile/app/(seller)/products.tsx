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

  const { data: catalog, isLoading } = useQuery({
    queryKey: ['product-catalog-search', query],
    queryFn: () => productsApi.getCatalog({ q: query || undefined, limit: 50 }),
    enabled: visible,
  });

  const catalogItems = Array.isArray(catalog)
    ? catalog
    : Array.isArray(catalog?.items) ? catalog.items : [];

  const addMutation = useMutation({
    mutationFn: (data: { product_id: number; price: number }) =>
      storeProductsApi.create({ ...data, store_id: storeId, is_available: true }),
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
    addMutation.mutate({ product_id: Number(selected.id), price: p });
  };

  // Step 2: price form
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
          <Text style={m.subtitle}>
            {lang === 'ru'
              ? 'Товар по умолчанию — в наличии'
              : "Mahsulot avtomatik mavjud deb belgilanadi"}
          </Text>

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
                <Text style={m.addBtnTxt}>{lang === 'ru' ? "Добавить" : "Do'konga qo'shish"}</Text>
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

// ─── Edit Sheet ──────────────────────────────────────────────────────────
function EditProductSheet({
  visible, storeId, item, onClose,
}: {
  visible: boolean;
  storeId: string;
  item: any | null;
  onClose: () => void;
}) {
  const { lang, t } = useTranslation();
  const queryClient = useQueryClient();
  const slideY = useRef(new Animated.Value(600)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const [price, setPrice] = useState('');

  useEffect(() => {
    if (visible) {
      setPrice(item?.price != null ? String(Math.round(Number(item.price))) : '');
      Animated.parallel([
        Animated.timing(bgOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideY, { toValue: 0, friction: 9, tension: 80, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(bgOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideY, { toValue: 600, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, item]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['store-products'] });

  const priceMutation = useMutation({
    mutationFn: (p: number) => storeProductsApi.setPrice(item.id, storeId, p),
    onSuccess: invalidate,
  });

  const availMutation = useMutation({
    mutationFn: (avail: boolean) =>
      storeProductsApi.setAvailability(item.id, storeId, avail),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: () => storeProductsApi.remove(item.id, storeId),
    onSuccess: () => { invalidate(); onClose(); },
  });

  const isAvailable = item?.status === 'AVAILABLE';

  const confirmRemove = () =>
    Alert.alert(
      lang === 'ru' ? 'Удалить товар?' : 'Mahsulotni olib tashlash?',
      lang === 'ru'
        ? 'Товар полностью удалится из вашего магазина'
        : "Mahsulot do'koningizdan butunlay olib tashlanadi",
      [
        { text: lang === 'ru' ? 'Отмена' : 'Bekor', style: 'cancel' },
        {
          text: lang === 'ru' ? 'Удалить' : 'Olib tashlash',
          style: 'destructive',
          onPress: () => removeMutation.mutate(),
        },
      ],
    );

  const savePrice = () => {
    const p = parseFloat(price);
    if (!p || p <= 0) return;
    priceMutation.mutate(p);
  };

  if (!item) return null;

  const img = item.product?.images?.[0]?.url;

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      <Animated.View style={[m.backdrop, { opacity: bgOpacity }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[m.sheet, m.sheetSmall, { transform: [{ translateY: slideY }] }]}>
        <View style={m.handle} />
        <Text style={m.title}>{t(item.product?.name)}</Text>

        <View style={m.selectedCard}>
          {img ? (
            <Image source={{ uri: imageUrl(img)! }} style={m.selectedImg} resizeMode="cover" />
          ) : (
            <View style={[m.selectedImg, { backgroundColor: Colors.primarySurface, alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="cube-outline" size={24} color={Colors.primaryLight} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={m.selectedName} numberOfLines={2}>{t(item.product?.name)}</Text>
            {item.product?.category?.name && (
              <Text style={m.catalogCat}>{t(item.product.category.name)}</Text>
            )}
          </View>
        </View>

        {/* Price */}
        <Text style={m.fieldLabel}>{lang === 'ru' ? 'Цена' : 'Narx'}</Text>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <View style={[m.inputWrap, { flex: 1 }]}>
            <Ionicons name="pricetag-outline" size={18} color={Colors.primary} />
            <TextInput
              style={m.input}
              placeholder={lang === 'ru' ? "Цена (сум)" : "Narx (so'm)"}
              placeholderTextColor={Colors.textHint}
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />
          </View>
          <TouchableOpacity
            style={m.savePriceBtn}
            onPress={savePrice}
            disabled={priceMutation.isPending}
            activeOpacity={0.85}
          >
            {priceMutation.isPending ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Ionicons name="checkmark" size={20} color={Colors.white} />
            )}
          </TouchableOpacity>
        </View>

        {/* Availability */}
        <Text style={m.fieldLabel}>{lang === 'ru' ? 'Статус' : 'Holati'}</Text>
        <View style={m.availRow}>
          <TouchableOpacity
            style={[m.availBtn, isAvailable && m.availBtnActive]}
            onPress={() => availMutation.mutate(true)}
            disabled={availMutation.isPending}
            activeOpacity={0.85}
          >
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={isAvailable ? Colors.white : Colors.success}
            />
            <Text style={[m.availTxt, isAvailable && { color: Colors.white }]}>
              {lang === 'ru' ? 'В наличии' : 'Mavjud'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[m.availBtn, !isAvailable && m.availBtnInactive]}
            onPress={() => availMutation.mutate(false)}
            disabled={availMutation.isPending}
            activeOpacity={0.85}
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={!isAvailable ? Colors.white : Colors.error}
            />
            <Text style={[m.availTxt, !isAvailable && { color: Colors.white }]}>
              {lang === 'ru' ? 'Нет пока' : "Hozircha yo'q"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Remove */}
        <TouchableOpacity
          style={m.removeBtn}
          onPress={confirmRemove}
          disabled={removeMutation.isPending}
          activeOpacity={0.85}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.error} />
          <Text style={m.removeBtnTxt}>
            {lang === 'ru' ? 'Удалить из магазина' : "Do'kondan olib tashlash"}
          </Text>
        </TouchableOpacity>

        <View style={{ height: Platform.OS === 'ios' ? 28 : 16 }} />
      </Animated.View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SellerProductsScreen() {
  const { lang, t } = useTranslation();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);

  const { data: myStores } = useQuery({ queryKey: ['my-stores'], queryFn: storesApi.getMyStores });
  const storeId = myStores?.[0]?.id;

  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['store-products', storeId],
    queryFn: () =>
      storeProductsApi.getByStore(storeId!).then((r) => r) ??
      Promise.resolve([]),
    enabled: !!storeId,
  });

  const items = Array.isArray(products) ? products : [];
  const availCount = items.filter((p: any) => p.status === 'AVAILABLE').length;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.title}>{lang === 'ru' ? 'Товары' : 'Mahsulotlar'}</Text>
            <Text style={s.subtitle}>
              {items.length} {lang === 'ru' ? 'шт' : 'ta'} · {availCount} {lang === 'ru' ? 'в наличии' : 'mavjud'}
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
          const isAvailable = item.status === 'AVAILABLE';
          return (
            <TouchableOpacity
              style={s.card}
              activeOpacity={0.88}
              onPress={() => setEditItem(item)}
            >
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
                  <View
                    style={[
                      s.statusPill,
                      { backgroundColor: isAvailable ? '#E8F5E9' : '#FFEBEE' },
                    ]}
                  >
                    <View
                      style={[
                        s.statusDot,
                        { backgroundColor: isAvailable ? Colors.success : Colors.error },
                      ]}
                    />
                    <Text
                      style={[
                        s.statusTxt,
                        { color: isAvailable ? Colors.success : Colors.error },
                      ]}
                    >
                      {isAvailable
                        ? (lang === 'ru' ? 'В наличии' : 'Mavjud')
                        : (lang === 'ru' ? 'Нет пока' : "Hozircha yo'q")}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={s.editBtn}>
                <Ionicons name="chevron-forward" size={16} color={Colors.textHint} />
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {storeId && (
        <AddProductModal
          visible={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          storeId={storeId}
        />
      )}

      {storeId && (
        <EditProductSheet
          visible={!!editItem}
          storeId={storeId}
          item={editItem}
          onClose={() => setEditItem(null)}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
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
  list: { flexGrow: 1, backgroundColor: Colors.background, padding: Spacing.md, gap: Spacing.sm, paddingBottom: 100 },

  card: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    flexDirection: 'row', ...Shadow.sm, overflow: 'hidden',
  },
  image: { width: 90, height: 90 },
  imagePlaceholder: { backgroundColor: Colors.primarySurface, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, padding: Spacing.sm, gap: 4 },
  name: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, lineHeight: 18 },
  price: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 4 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontSize: 11, fontWeight: '700' },
  editBtn: { padding: Spacing.md, alignItems: 'center', justifyContent: 'center' },

  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 24, backgroundColor: Colors.primarySurface, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: 13, color: Colors.textHint, textAlign: 'center', paddingHorizontal: Spacing.xl },
});

// ─── Modal Styles ──────────────────────────────────────────────────────────────
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
    paddingTop: 12,
    paddingHorizontal: Spacing.md,
    height: '80%',
    ...Shadow.lg,
  },
  sheetSmall: { height: undefined, paddingBottom: Platform.OS === 'ios' ? 28 : 16 },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.divider, alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 12, color: Colors.textHint, marginBottom: Spacing.md },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.background, borderRadius: Radius.lg,
    height: 44, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },

  catalogCard: {
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'center',
    backgroundColor: Colors.background, borderRadius: Radius.lg,
    padding: Spacing.sm,
  },
  catalogImg: { width: 48, height: 48, borderRadius: Radius.md },
  catalogName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, lineHeight: 18 },
  catalogCat: { fontSize: 11, color: Colors.textHint, marginTop: 2 },

  selectedCard: {
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'center',
    backgroundColor: Colors.background, borderRadius: Radius.lg,
    padding: Spacing.sm, marginBottom: Spacing.md,
  },
  selectedImg: { width: 56, height: 56, borderRadius: Radius.md },
  selectedName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, lineHeight: 18 },
  changeBtn: { fontSize: 12, color: Colors.primary, marginTop: 4, fontWeight: '600' },

  fieldLabel: {
    fontSize: 12, fontWeight: '700', color: Colors.textHint,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 8, marginTop: Spacing.sm, paddingLeft: 4,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.background, borderRadius: Radius.lg,
    height: 48, paddingHorizontal: Spacing.md,
  },
  input: { flex: 1, fontSize: 15, color: Colors.textPrimary, fontWeight: '600' },

  savePriceBtn: {
    width: 48, height: 48, borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.sm,
  },

  availRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  availBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, height: 46, borderRadius: Radius.lg,
    backgroundColor: Colors.background,
    borderWidth: 1.5, borderColor: Colors.divider,
  },
  availBtnActive: { backgroundColor: Colors.success, borderColor: Colors.success },
  availBtnInactive: { backgroundColor: Colors.error, borderColor: Colors.error },
  availTxt: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },

  removeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, height: 46, borderRadius: Radius.lg,
    backgroundColor: Colors.errorSurface,
    borderWidth: 1, borderColor: Colors.errorSurface,
  },
  removeBtnTxt: { fontSize: 14, fontWeight: '600', color: Colors.error },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, height: 50, borderRadius: Radius.lg,
    backgroundColor: Colors.primary, ...Shadow.md,
    marginTop: Spacing.sm,
  },
  addBtnTxt: { fontSize: 15, fontWeight: '700', color: Colors.white },
});
