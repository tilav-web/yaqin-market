import React from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Image, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { storeProductsApi } from '../../src/api/products';
import { storesApi } from '../../src/api/stores';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.yaqin-market.uz';
function imageUrl(path?: string) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_URL}/${path}`;
}

export default function SellerProductsScreen() {
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
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.title}>Mahsulotlar</Text>
            <Text style={s.subtitle}>{items.length} ta · {activeCount} faol</Text>
          </View>
          <TouchableOpacity style={s.addBtn} activeOpacity={0.85}>
            <Ionicons name="add" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={s.empty}>
              <View style={s.emptyIconBox}>
                <Ionicons name="bag-outline" size={40} color={Colors.primaryLight} />
              </View>
              <Text style={s.emptyTitle}>Mahsulot yo'q</Text>
              <Text style={s.emptySub}>Yangi mahsulot qo'shish uchun + tugmasini bosing</Text>
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
                <Text style={s.name} numberOfLines={2}>{item.product?.name}</Text>
                <Text style={s.price}>{Number(item.price).toLocaleString()} so'm</Text>
                <View style={s.bottomRow}>
                  <View style={s.stockPill}>
                    <Ionicons name="layers-outline" size={12} color={Colors.textHint} />
                    <Text style={s.stockTxt}>{item.stock} ta</Text>
                  </View>
                  <View style={[s.statusPill, { backgroundColor: isActive ? '#E8F5E9' : '#FFEBEE' }]}>
                    <View style={[s.statusDot, { backgroundColor: isActive ? Colors.success : Colors.error }]} />
                    <Text style={[s.statusTxt, { color: isActive ? Colors.success : Colors.error }]}>
                      {isActive ? 'Faol' : 'Nofaol'}
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
    </SafeAreaView>
  );
}

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

  list: { padding: Spacing.md, gap: Spacing.sm },
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
  editBtn: {
    width: 40, alignItems: 'center', justifyContent: 'center',
  },

  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyIconBox: { width: 80, height: 80, borderRadius: 24, backgroundColor: Colors.primarySurface, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: 13, color: Colors.textHint, textAlign: 'center', paddingHorizontal: 40, lineHeight: 19 },
});
