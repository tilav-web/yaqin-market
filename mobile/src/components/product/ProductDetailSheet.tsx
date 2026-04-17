import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Modal, Animated, Pressable, ScrollView, Platform, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Colors, Spacing, Radius, Shadow } from '../../theme';
import { productsApi } from '../../api/products';
import { useCartStore } from '../../store/cart.store';
import { useTranslation } from '../../i18n';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
function imageUrl(path?: string) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_URL}/${path}`;
}

type Props = {
  productId: number | null;
  onClose: () => void;
};

export default function ProductDetailSheet({ productId, onClose }: Props) {
  const { lang, t } = useTranslation();
  const { addBroadcastItem, addDirectItem } = useCartStore();
  const slideY = useRef(new Animated.Value(600)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);

  const visible = productId !== null;

  // 1. Tanlangan mahsulotni yuklash
  const { data: product, isLoading } = useQuery({
    queryKey: ['product-detail', productId],
    queryFn: () => productsApi.getById(productId!),
    enabled: !!productId,
  });

  // 2. Agar child bo'lsa — parent ni yuklash (uning barcha children lari bilan)
  const parentId = product?.parent_id ?? product?.parent?.id;
  const isChild = !!parentId;

  const { data: parentProduct } = useQuery({
    queryKey: ['product-detail', parentId],
    queryFn: () => productsApi.getById(parentId!),
    enabled: !!parentId,
  });

  // Ota mahsulot — agar child bosilsa parent, aks holda o'zi
  const rootProduct = isChild ? parentProduct : product;
  // Barcha variantlar — ota + uning barcha children lari
  const allVariants = rootProduct?.children?.length > 0
    ? [rootProduct, ...rootProduct.children]
    : product?.children?.length > 0
    ? [product, ...product.children]
    : [];

  useEffect(() => {
    if (visible) {
      setQuantity(1);
      // Child bosilgan bo'lsa — drawer ochilganda shu child tanlangan bo'lsin
      // Parent bosilgan bo'lsa — null (parent o'zi ko'rinadi)
      setSelectedChild(null);
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

  // Hozir tanlangan variant — agar foydalanuvchi chipdan tanlasa shu, aks holda boshlang'ich product
  const activeProduct = selectedChild ?? product;
  const hasVariants = allVariants.length > 1;
  const img = activeProduct?.images?.[0]?.url;
  const images = activeProduct?.images ?? [];
  const storeProduct = activeProduct?.storeProducts?.[0];
  const price = storeProduct?.price;
  const unitName = t(product?.unit?.short_name) || t(product?.unit?.name);

  const handleAdd = () => {
    if (!activeProduct) return;
    if (storeProduct) {
      addDirectItem({
        store_product_id: storeProduct.id,
        store_id: storeProduct.store_id,
        product_name: t(activeProduct.name),
        product_image: img,
        price: Number(price),
        quantity,
      });
    } else {
      addBroadcastItem({
        product_id: activeProduct.id,
        product_name: activeProduct.name,
        product_image: img,
        quantity,
      });
    }
    onClose();
  };

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      <Animated.View style={[s.backdrop, { opacity: bgOpacity }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[s.sheet, { transform: [{ translateY: slideY }] }]}>
        <View style={s.handle} />

        {isLoading || !product || (isChild && !parentProduct) ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Text style={{ color: Colors.textHint }}>{lang === 'ru' ? 'Загрузка...' : 'Yuklanmoqda...'}</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* Images */}
            {images.length > 0 ? (
              <FlatList
                data={images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_, i) => String(i)}
                renderItem={({ item }) => (
                  <Image source={{ uri: imageUrl(item.url)! }} style={s.mainImage} resizeMode="cover" />
                )}
              />
            ) : (
              <View style={[s.mainImage, { backgroundColor: Colors.primarySurface, alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="cube-outline" size={56} color={Colors.primaryLight} />
              </View>
            )}

            <View style={s.content}>
              {/* Name + price */}
              <Text style={s.name}>{t(activeProduct?.name)}</Text>
              {price != null ? (
                <View style={s.priceRow}>
                  <Text style={s.price}>{Number(price).toLocaleString()} so'm</Text>
                  {unitName ? <Text style={s.unit}>/ {unitName}</Text> : null}
                </View>
              ) : (
                <Text style={s.noPrice}>{lang === 'ru' ? 'Цена не указана' : 'Narx ko\'rsatilmagan'}</Text>
              )}

              {/* Description */}
              {product.description && (
                <Text style={s.desc}>{t(product.description)}</Text>
              )}

              {/* Variants — istalgan variant bosilsa barchasi ko'rinadi */}
              {hasVariants && (
                <View style={s.variantsSection}>
                  <Text style={s.variantsTitle}>
                    {lang === 'ru' ? 'Варианты' : 'Variantlar'}
                  </Text>
                  <View style={s.variantsList}>
                    {allVariants.map((variant: any) => {
                      const isActive = activeProduct?.id === variant.id;
                      return (
                        <TouchableOpacity
                          key={variant.id}
                          style={[s.variantChip, isActive && s.variantChipActive]}
                          onPress={() => setSelectedChild(variant.id === product?.id ? null : variant)}
                        >
                          <Text style={[s.variantText, isActive && s.variantTextActive]}>
                            {t(variant.name)}
                          </Text>
                          {variant.storeProducts?.[0]?.price != null && (
                            <Text style={[s.variantPrice, isActive && { color: Colors.primary }]}>
                              {Number(variant.storeProducts[0].price).toLocaleString()} so'm
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Quantity + Add button */}
              <View style={s.actionRow}>
                <View style={s.qtyRow}>
                  <TouchableOpacity
                    style={s.qtyBtn}
                    onPress={() => setQuantity(q => Math.max(1, q - 1))}
                  >
                    <Ionicons name="remove" size={18} color={Colors.primary} />
                  </TouchableOpacity>
                  <Text style={s.qtyText}>{quantity}</Text>
                  <TouchableOpacity
                    style={[s.qtyBtn, s.qtyBtnPlus]}
                    onPress={() => setQuantity(q => q + 1)}
                  >
                    <Ionicons name="add" size={18} color={Colors.white} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={s.addBtn} onPress={handleAdd} activeOpacity={0.85}>
                  <Ionicons name="cart-outline" size={18} color={Colors.white} />
                  <Text style={s.addBtnText}>
                    {price
                      ? `${(Number(price) * quantity).toLocaleString()} so'm`
                      : (lang === 'ru' ? 'Добавить' : "Qo'shish")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ height: Platform.OS === 'ios' ? 28 : 16 }} />
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
    maxHeight: '88%', ...Shadow.lg,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.divider,
    alignSelf: 'center', marginTop: 12, marginBottom: 8,
  },
  mainImage: { width: '100%', height: 240 },
  content: { padding: Spacing.md, gap: Spacing.sm },
  name: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, lineHeight: 26 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  price: { fontSize: 22, fontWeight: '800', color: Colors.primary },
  unit: { fontSize: 14, color: Colors.textHint },
  noPrice: { fontSize: 14, color: Colors.textHint },
  desc: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },

  variantsSection: { marginTop: Spacing.xs },
  variantsTitle: { fontSize: 13, fontWeight: '700', color: Colors.textHint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.xs },
  variantsList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  variantChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.background,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  variantChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primarySurface },
  variantText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  variantTextActive: { color: Colors.primary, fontWeight: '700' },
  variantPrice: { fontSize: 11, color: Colors.textHint, marginTop: 1 },

  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  qtyBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnPlus: { backgroundColor: Colors.primary },
  qtyText: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, minWidth: 28, textAlign: 'center' },
  addBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, paddingVertical: 14,
    borderRadius: Radius.lg, ...Shadow.md,
  },
  addBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
