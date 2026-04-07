import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../src/theme';
import { Badge } from '../../src/components/ui/Badge';
import { ordersApi } from '../../src/api/orders';

export default function BroadcastFeedScreen() {
  const router = useRouter();

  const { data: feed, isLoading, refetch } = useQuery({
    queryKey: ['broadcast-feed'],
    queryFn: () => ordersApi.getBroadcastFeed(10),
    refetchInterval: 30000,
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>📢 Umumiy buyurtmalar</Text>
        <Text style={styles.subtitle}>Yaqin atrofdan kelgan buyurtmalar</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      ) : (
        <FlatList
          data={feed ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>Hozircha buyurtma yo'q</Text>
              <Text style={styles.emptySubtext}>Yaqin atrofdagi buyurtmalar bu yerda ko'rinadi</Text>
            </View>
          }
          renderItem={({ item: request }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: '/(seller)/broadcast-offer/[id]',
                  params: { id: request.id },
                })
              }
              activeOpacity={0.85}
            >
              <View style={styles.cardTop}>
                <Text style={styles.requestTitle}>{request.title}</Text>
                <Badge label="🟢 Ochiq" color={Colors.success} bg={Colors.successSurface} />
              </View>

              <View style={styles.itemsList}>
                {request.items?.slice(0, 3).map((item: any) => (
                  <Text key={item.id} style={styles.itemText}>
                    • {item.product_name} — {item.quantity} ta
                  </Text>
                ))}
                {(request.items?.length ?? 0) > 3 && (
                  <Text style={styles.moreText}>
                    +{request.items.length - 3} ta mahsulot
                  </Text>
                )}
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.offerCount}>
                  {request.offers?.length ?? 0} ta taklif
                </Text>
                {request.my_offer ? (
                  <Badge label="✅ Taklifingiz yuborildi" color={Colors.success} bg={Colors.successSurface} />
                ) : (
                  <Text style={styles.actionText}>Taklif yuborish →</Text>
                )}
              </View>
            </TouchableOpacity>
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
  subtitle: { ...Typography.caption, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  list: { padding: Spacing.md, gap: Spacing.sm },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadow.sm,
    gap: Spacing.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  requestTitle: { ...Typography.title, flex: 1 },
  itemsList: { gap: 2 },
  itemText: { ...Typography.bodySmall, color: Colors.textSecondary },
  moreText: { ...Typography.caption, color: Colors.textHint },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  offerCount: { ...Typography.caption, color: Colors.textHint },
  actionText: { ...Typography.bodySmall, color: Colors.primary, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyIcon: { fontSize: 48 },
  emptyText: { ...Typography.body, color: Colors.textSecondary },
  emptySubtext: { ...Typography.caption, color: Colors.textHint, textAlign: 'center' },
});
