import React from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { ordersApi } from '../../src/api/orders';

export default function BroadcastFeedScreen() {
  const router = useRouter();

  const { data: feed, isLoading, refetch } = useQuery({
    queryKey: ['broadcast-feed'],
    queryFn: () => ordersApi.getBroadcastFeed(10),
    refetchInterval: 30000,
  });

  const requests = Array.isArray(feed) ? feed : [];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.title}>Umumiy buyurtmalar</Text>
            <Text style={s.subtitle}>{requests.length} ta talab · Yaqin atrofdан</Text>
          </View>
          <View style={s.livePill}>
            <View style={s.liveDot} />
            <Text style={s.liveTxt}>Jonli</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={requests}
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
                <Ionicons name="megaphone-outline" size={40} color={Colors.primaryLight} />
              </View>
              <Text style={s.emptyTitle}>Buyurtma yo'q</Text>
              <Text style={s.emptySub}>Yaqin atrofdagi umumiy buyurtmalar bu yerda ko'rinadi</Text>
            </View>
          ) : null
        }
        renderItem={({ item: request }) => {
          const hasMyOffer = !!request.my_offer;
          const offerCount = request.offers?.length ?? 0;
          return (
            <TouchableOpacity
              style={s.card}
              onPress={() =>
                router.push({
                  pathname: '/(seller)/broadcast-offer/[id]',
                  params: { id: request.id },
                })
              }
              activeOpacity={0.88}
            >
              {/* Card top */}
              <View style={s.cardTop}>
                <View style={s.titleRow}>
                  <View style={s.megaIcon}>
                    <Ionicons name="megaphone-outline" size={16} color="#FF9800" />
                  </View>
                  <Text style={s.requestTitle} numberOfLines={1}>{request.title}</Text>
                </View>
                {hasMyOffer ? (
                  <View style={s.sentPill}>
                    <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
                    <Text style={s.sentTxt}>Yuborildi</Text>
                  </View>
                ) : (
                  <View style={s.openPill}>
                    <Text style={s.openTxt}>Ochiq</Text>
                  </View>
                )}
              </View>

              {/* Items */}
              <View style={s.itemsBlock}>
                {request.items?.slice(0, 3).map((item: any) => (
                  <View key={item.id} style={s.itemRow}>
                    <View style={s.itemDot} />
                    <Text style={s.itemTxt} numberOfLines={1}>{item.product_name}</Text>
                    <Text style={s.itemQty}>× {item.quantity}</Text>
                  </View>
                ))}
                {(request.items?.length ?? 0) > 3 && (
                  <Text style={s.moreTxt}>+{request.items.length - 3} ta mahsulot yana</Text>
                )}
              </View>

              <View style={s.divider} />

              {/* Footer */}
              <View style={s.cardFooter}>
                <View style={s.footerMeta}>
                  <Ionicons name="chatbubble-outline" size={13} color={Colors.textHint} />
                  <Text style={s.offerCount}>{offerCount} ta taklif</Text>
                </View>
                {!hasMyOffer && (
                  <View style={s.actionRow}>
                    <Text style={s.actionTxt}>Taklif yuborish</Text>
                    <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
                  </View>
                )}
              </View>
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
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: Radius.full,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#A5D6A7' },
  liveTxt: { fontSize: 11, fontWeight: '600', color: Colors.white },

  list: { padding: Spacing.md, gap: Spacing.sm },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, ...Shadow.sm, gap: Spacing.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1, marginRight: Spacing.sm },
  megaIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center' },
  requestTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  sentPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full,
  },
  sentTxt: { fontSize: 11, fontWeight: '600', color: Colors.success },
  openPill: {
    backgroundColor: Colors.primarySurface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full,
  },
  openTxt: { fontSize: 11, fontWeight: '600', color: Colors.primary },

  itemsBlock: { gap: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.border },
  itemTxt: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  itemQty: { fontSize: 12, fontWeight: '600', color: Colors.textHint },
  moreTxt: { fontSize: 12, color: Colors.textHint, marginTop: 2, paddingLeft: 11 },

  divider: { height: 1, backgroundColor: Colors.divider },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  offerCount: { fontSize: 12, color: Colors.textHint },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionTxt: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyIconBox: { width: 80, height: 80, borderRadius: 24, backgroundColor: Colors.primarySurface, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: 13, color: Colors.textHint, textAlign: 'center', paddingHorizontal: 40, lineHeight: 19 },
});
