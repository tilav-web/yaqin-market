import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../src/theme';
import { ordersApi } from '../../src/api/orders';

export default function CourierHistoryScreen() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['courier-history'],
    queryFn: () => ordersApi.getMyCourierOrders('DELIVERED'),
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>📋 Yetkazib berish tarixi</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      ) : (
        <FlatList
          data={orders ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>Hali yetkazib berish yo'q</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.orderNum}>{item.order_number}</Text>
                <Text style={styles.price}>{Number(item.total_price).toLocaleString()} so'm</Text>
              </View>
              <Text style={styles.store}>🏪 {item.store?.name}</Text>
              <Text style={styles.date}>
                {new Date(item.delivered_at ?? item.updatedAt).toLocaleDateString('uz-UZ')}
              </Text>
            </View>
          )}
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
    padding: Spacing.md,
    ...Shadow.sm,
    gap: 4,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  orderNum: { ...Typography.title, fontSize: 15 },
  price: { ...Typography.bodySmall, fontWeight: '700', color: Colors.success },
  store: { ...Typography.caption, color: Colors.textSecondary },
  date: { ...Typography.caption, color: Colors.textHint },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyIcon: { fontSize: 48 },
  emptyText: { ...Typography.body, color: Colors.textSecondary },
});
