import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../src/theme';
import { Badge } from '../../src/components/ui/Badge';
import { storeProductsApi } from '../../src/api/products';
import { storesApi } from '../../src/api/stores';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
function imageUrl(path?: string) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_URL}/${path}`;
}

export default function SellerProductsScreen() {
  const { data: myStores } = useQuery({ queryKey: ['my-stores'], queryFn: storesApi.getMyStores });
  const storeId = myStores?.[0]?.id;

  const { data: products, isLoading } = useQuery({
    queryKey: ['store-products', storeId],
    queryFn: () => storeProductsApi.getByStore(storeId!),
    enabled: !!storeId,
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Mahsulotlarim</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      ) : (
        <FlatList
          data={products ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const img = item.product?.images?.[0]?.url;
            return (
              <View style={styles.card}>
                {img ? (
                  <Image source={{ uri: imageUrl(img)! }} style={styles.image} />
                ) : (
                  <View style={[styles.image, styles.imagePlaceholder]}>
                    <Text style={{ fontSize: 24 }}>📦</Text>
                  </View>
                )}
                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={2}>{item.product?.name}</Text>
                  <Text style={styles.price}>{Number(item.price).toLocaleString()} so'm</Text>
                  <View style={styles.row}>
                    <Text style={styles.stock}>Qoldiq: {item.stock} ta</Text>
                    <Badge
                      label={item.status === 'ACTIVE' ? '🟢 Faol' : '🔴 Nofaol'}
                      color={item.status === 'ACTIVE' ? Colors.success : Colors.error}
                      bg={item.status === 'ACTIVE' ? Colors.successSurface : Colors.errorSurface}
                    />
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, padding: Spacing.md },
  title: { ...Typography.h4, color: Colors.white },
  list: { padding: Spacing.md, gap: Spacing.sm },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    ...Shadow.sm,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  image: { width: 80, height: 80 },
  imagePlaceholder: { backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, padding: Spacing.sm, gap: 4 },
  name: { ...Typography.bodySmall, fontWeight: '500' },
  price: { ...Typography.priceSmall },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stock: { ...Typography.caption, color: Colors.textHint },
});
