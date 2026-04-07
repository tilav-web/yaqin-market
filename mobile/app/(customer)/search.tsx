import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../src/theme';
import { Input } from '../../src/components/ui';
import { productsApi } from '../../src/api/products';
import { useCartStore } from '../../src/store/cart.store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
function imageUrl(path?: string) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_URL}/${path}`;
}

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { addBroadcastItem } = useCartStore();

  const { data, isLoading } = useQuery({
    queryKey: ['search-products', query],
    queryFn: () => productsApi.getCatalog({ q: query, limit: 30 }),
    enabled: query.length >= 1,
  });

  const products = data?.items ?? data ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Qidirish</Text>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Mahsulot yoki do'kon nomini kiriting..."
          containerStyle={styles.searchInput}
        />
      </View>

      {isLoading && <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />}

      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        numColumns={2}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={
          query.length > 0 && !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>Hech narsa topilmadi</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const img = item.images?.[0]?.url;
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: '/(customer)/product/[id]',
                  params: { id: item.id },
                })
              }
            >
              {img ? (
                <Image source={{ uri: imageUrl(img)! }} style={styles.image} />
              ) : (
                <View style={[styles.image, styles.imagePlaceholder]}>
                  <Text style={{ fontSize: 28 }}>📦</Text>
                </View>
              )}
              <View style={styles.cardInfo}>
                <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() =>
                      addBroadcastItem({
                        product_id: item.id,
                        product_name: item.name,
                        product_image: img,
                        quantity: 1,
                      })
                    }
                  >
                    <Text style={styles.addBtnText}>+ Qo'shish</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  title: { ...Typography.h4, color: Colors.white },
  searchInput: { marginBottom: 0 },
  list: { padding: Spacing.md },
  row: { gap: Spacing.sm, marginBottom: Spacing.sm },
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  image: { width: '100%', height: 120 },
  imagePlaceholder: {
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { padding: Spacing.sm },
  name: { ...Typography.bodySmall, marginBottom: Spacing.xs },
  cardActions: { flexDirection: 'row' },
  addBtn: {
    backgroundColor: Colors.primarySurface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  addBtnText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyIcon: { fontSize: 40 },
  emptyText: { ...Typography.body, color: Colors.textSecondary },
});
