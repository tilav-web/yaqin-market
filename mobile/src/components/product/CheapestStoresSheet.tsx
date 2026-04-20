import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Modal, Animated, Pressable, ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Colors, Spacing, Radius, Shadow } from '../../theme';
import { productsApi, type CheapestStoreItem } from '../../api/products';
import { useCartStore } from '../../store/cart.store';
import { useLocationStore } from '../../store/location.store';
import { useTranslation } from '../../i18n';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
function imageUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_URL}/${path}`;
}

type Props = {
  productId: number | null;
  productName?: any;
  onClose: () => void;
};

export default function CheapestStoresSheet({ productId, productName, onClose }: Props) {
  const { lang, t } = useTranslation();
  const { addStoreItem } = useCartStore();
  const { lat, lng } = useLocationStore();

  const slideY = useRef(new Animated.Value(600)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;

  const visible = productId !== null;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['cheapest-stores', productId, lat, lng],
    queryFn: () =>
      productsApi.getCheapestStores(productId!, {
        lat: lat ?? undefined,
        lng: lng ?? undefined,
        limit: 15,
      }),
    enabled: !!productId,
    retry: 1,
  });

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(bgOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideY, { toValue: 0, friction: 8, tension: 70, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(bgOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideY, { toValue: 600, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const handleAddToStoreCart = (item: CheapestStoreItem) => {
    const img = item.variant.images?.[0]?.url;
    addStoreItem(
      {
        store_product_id: item.store_product_id,
        product_id: item.variant.id,
        store_id: item.store.id,
        store_name: item.store.name,
        product_name: t(item.variant.name),
        product_image: img,
        price: item.price,
        quantity: 1,
      },
      item.store.logo ?? undefined,
    );
    onClose();
  };

  const items = data ?? [];
  const cheapest = items[0];

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      <Animated.View style={[s.backdrop, { opacity: bgOpacity }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[s.sheet, { transform: [{ translateY: slideY }] }]}>
        <View style={s.handle} />

        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>
              {lang === 'ru' ? 'Самые дешёвые магазины' : "Eng arzon do'konlar"}
            </Text>
            {productName ? (
              <Text style={s.subtitle} numberOfLines={1}>{t(productName)}</Text>
            ) : null}
          </View>
          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        ) : items.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Ionicons name="storefront-outline" size={36} color={Colors.primaryLight} />
            </View>
            <Text style={s.emptyTitle}>
              {lang === 'ru' ? 'Товар недоступен' : 'Mahsulot mavjud emas'}
            </Text>
            <Text style={s.emptySub}>
              {lang === 'ru'
                ? 'Пока ни один магазин не предлагает этот товар'
                : "Hozircha hech qaysi do'kon bu mahsulotni taklif qilmayapti"}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={{ maxHeight: '80%' }}
            contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 32 : 16 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Eng arzon banner */}
            {cheapest && (
              <View style={s.cheapBanner}>
                <View style={s.cheapBadge}>
                  <Ionicons name="flash" size={12} color={Colors.white} />
                  <Text style={s.cheapBadgeTxt}>
                    {lang === 'ru' ? 'Самый дешёвый' : 'Eng arzon'}
                  </Text>
                </View>
                <Text style={s.cheapPrice}>
                  {Number(cheapest.price).toLocaleString()} so'm
                </Text>
              </View>
            )}

            {items.map((item, idx) => {
              const isCheapest = idx === 0;
              const distKm =
                item.distance_meters != null
                  ? (item.distance_meters / 1000).toFixed(1)
                  : null;
              const unit =
                item.variant.unit?.short_name
                  ? t(item.variant.unit.short_name)
                  : item.variant.unit?.name
                  ? t(item.variant.unit.name)
                  : null;
              const variantLabel = t(item.variant.name);

              return (
                <TouchableOpacity
                  key={item.store_product_id}
                  style={[s.card, isCheapest && s.cardCheapest]}
                  onPress={() => handleAddToStoreCart(item)}
                  activeOpacity={0.85}
                >
                  {/* Logo */}
                  {item.store.logo ? (
                    <Image
                      source={{ uri: imageUrl(item.store.logo)! }}
                      style={s.logo}
                    />
                  ) : (
                    <View style={[s.logo, s.logoPlaceholder]}>
                      <Ionicons name="storefront" size={18} color={Colors.primary} />
                    </View>
                  )}

                  {/* Info */}
                  <View style={{ flex: 1 }}>
                    <View style={s.nameRow}>
                      <Text style={s.storeName} numberOfLines={1}>
                        {item.store.name}
                      </Text>
                      {item.store.is_prime && (
                        <View style={s.primeBadge}>
                          <Ionicons name="star" size={9} color={Colors.white} />
                        </View>
                      )}
                    </View>

                    <Text style={s.variantTxt} numberOfLines={1}>
                      {variantLabel}
                      {unit ? ` · ${unit}` : ''}
                    </Text>

                    <View style={s.metaRow}>
                      {distKm && (
                        <View style={s.metaChip}>
                          <Ionicons name="location-outline" size={10} color={Colors.textHint} />
                          <Text style={s.metaTxt}>{distKm} km</Text>
                        </View>
                      )}
                      {item.is_free_delivery ? (
                        <View style={[s.metaChip, s.metaFree]}>
                          <Ionicons name="gift-outline" size={10} color={Colors.success} />
                          <Text style={[s.metaTxt, { color: Colors.success }]}>
                            {lang === 'ru' ? 'Бесплатно' : 'Tekin'}
                          </Text>
                        </View>
                      ) : item.is_deliverable ? (
                        <View style={s.metaChip}>
                          <Ionicons name="bicycle-outline" size={10} color={Colors.primary} />
                          <Text style={[s.metaTxt, { color: Colors.primary }]}>
                            {lang === 'ru' ? 'Доставляют' : 'Yetkazadi'}
                          </Text>
                        </View>
                      ) : item.is_deliverable === false ? (
                        <View style={s.metaChip}>
                          <Ionicons name="close-circle-outline" size={10} color={Colors.error} />
                          <Text style={[s.metaTxt, { color: Colors.error }]}>
                            {lang === 'ru' ? 'Не доставляют' : 'Yetkazmaydi'}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {/* Price + add */}
                  <View style={s.priceBox}>
                    <Text style={[s.price, isCheapest && { color: Colors.success }]}>
                      {Number(item.price).toLocaleString()}
                    </Text>
                    <Text style={s.priceSom}>so'm</Text>
                    <View style={s.addBtn}>
                      <Ionicons name="cart-outline" size={14} color={Colors.white} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingTop: 12,
    ...Shadow.lg,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.divider,
    alignSelf: 'center', marginBottom: 12,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  title: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: 12, color: Colors.textHint, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
  },

  cheapBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
    backgroundColor: '#F0FDF4',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  cheapBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.success,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full,
  },
  cheapBadgeTxt: { fontSize: 10, fontWeight: '800', color: Colors.white },
  cheapPrice: { fontSize: 18, fontWeight: '800', color: Colors.success, marginLeft: 'auto' },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.divider,
  },
  cardCheapest: {
    borderColor: Colors.success,
    backgroundColor: '#FAFFFB',
  },
  logo: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: Colors.background,
  },
  logoPlaceholder: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primarySurface,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  storeName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  primeBadge: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#FFB020',
    alignItems: 'center', justifyContent: 'center',
  },
  variantTxt: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap' },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.background,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: Radius.full,
  },
  metaFree: { backgroundColor: '#F0FDF4' },
  metaTxt: { fontSize: 10, fontWeight: '600', color: Colors.textHint },

  priceBox: { alignItems: 'flex-end', gap: 2 },
  price: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  priceSom: { fontSize: 10, color: Colors.textHint, marginTop: -3 },
  addBtn: {
    marginTop: 4,
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },

  empty: {
    padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm,
  },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginTop: Spacing.sm },
  emptySub: { fontSize: 12, color: Colors.textHint, textAlign: 'center', lineHeight: 17 },
});
