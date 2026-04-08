import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Alert, TextInput, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { useCartStore } from '../../src/store/cart.store';
import { useLocationStore } from '../../src/store/location.store';
import { ordersApi } from '../../src/api/orders';

export default function BroadcastCartScreen() {
  const router = useRouter();
  const { broadcastItems, removeBroadcastItem, updateBroadcastQuantity, clearBroadcastCart } = useCartStore();
  const { lat, lng, address } = useLocationStore();
  const [loading, setLoading] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState(address ?? '');

  const handleSubmit = async () => {
    if (broadcastItems.length === 0) { Alert.alert('Xato', "Savatcha bo'sh"); return; }
    if (!lat || !lng) { Alert.alert('Xato', 'Joylashuvingiz aniqlanmagan'); return; }
    if (!deliveryAddress.trim()) { Alert.alert('Xato', 'Yetkazib berish manzilini kiriting'); return; }

    setLoading(true);
    try {
      const request = await ordersApi.createBroadcastRequest({
        title: 'Yangi buyurtma',
        delivery_lat: lat,
        delivery_lng: lng,
        delivery_address: deliveryAddress,
        items: broadcastItems.map((item) => ({ product_id: item.product_id, quantity: item.quantity })),
        radius_km: 10,
        expires_in_minutes: 120,
      });
      clearBroadcastCart();
      router.replace({ pathname: '/(customer)/broadcast-request/[id]', params: { id: request.id } });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Xato yuz berdi';
      Alert.alert('Xato', Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  if (broadcastItems.length === 0) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Umumiy buyurtma</Text>
        </View>
        <View style={s.empty}>
          <View style={s.emptyIconBox}>
            <Ionicons name="megaphone-outline" size={44} color={Colors.primaryLight} />
          </View>
          <Text style={s.emptyTitle}>Savatcha bo'sh</Text>
          <Text style={s.emptySub}>Mahsulotlar qo'shing va barcha yaqin do'konlarga yuboring</Text>
          <TouchableOpacity style={s.searchBtn} onPress={() => router.push('/(customer)/search')} activeOpacity={0.85}>
            <Ionicons name="search" size={16} color={Colors.white} />
            <Text style={s.searchBtnTxt}>Mahsulotlar qidirish</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Umumiy buyurtma</Text>
          <Text style={s.headerSub}>{broadcastItems.length} ta mahsulot</Text>
        </View>
      </View>

      <FlatList
        data={broadcastItems}
        keyExtractor={(item) => String(item.product_id)}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <View style={s.infoCard}>
            <View style={s.infoIconBox}>
              <Ionicons name="information-circle-outline" size={18} color="#2196F3" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.infoTitle}>Qanday ishlaydi?</Text>
              <Text style={s.infoTxt}>
                Bu buyurtma yaqin atrofdagi barcha do'konlarga yuboriladi. Do'konlar narx taklif qiladi — siz eng yaxshisini tanlaysiz.
              </Text>
            </View>
          </View>
        }
        ListFooterComponent={
          <View style={s.footer}>
            <Text style={s.addressLabel}>Yetkazib berish manzili</Text>
            <View style={s.addressInputWrap}>
              <Ionicons name="location-outline" size={18} color={Colors.textHint} style={{ marginTop: 2 }} />
              <TextInput
                style={s.addressInput}
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                placeholder="Manzilni kiriting..."
                placeholderTextColor={Colors.textHint}
                multiline
              />
            </View>
            <TouchableOpacity
              style={[s.submitBtn, loading && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Ionicons name="paper-plane-outline" size={20} color={Colors.white} />
              <Text style={s.submitBtnTxt}>
                {loading ? 'Yuborilmoqda...' : `Yuborish (${broadcastItems.length} ta mahsulot)`}
              </Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.itemCard}>
            <View style={s.itemIconBox}>
              <Ionicons name="cube-outline" size={18} color={Colors.primary} />
            </View>
            <Text style={s.itemName} numberOfLines={2}>{item.product_name}</Text>
            <View style={s.qtyRow}>
              <TouchableOpacity
                style={s.qtyBtn}
                onPress={() => updateBroadcastQuantity(item.product_id, item.quantity - 1)}
              >
                <Ionicons name="remove" size={16} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={s.qty}>{item.quantity}</Text>
              <TouchableOpacity
                style={s.qtyBtn}
                onPress={() => updateBroadcastQuantity(item.product_id, item.quantity + 1)}
              >
                <Ionicons name="add" size={16} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={s.removeBtn}
                onPress={() => removeBroadcastItem(item.product_id)}
              >
                <Ionicons name="trash-outline" size={16} color={Colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    paddingTop: Platform.OS === 'android' ? Spacing.sm : Spacing.md,
    gap: Spacing.sm,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.white },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 1 },

  list: { padding: Spacing.md, gap: Spacing.sm },

  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: '#E3F2FD', borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  infoIconBox: { width: 32, height: 32, borderRadius: 9, backgroundColor: '#BBDEFB', alignItems: 'center', justifyContent: 'center' },
  infoTitle: { fontSize: 13, fontWeight: '700', color: '#1565C0', marginBottom: 3 },
  infoTxt: { fontSize: 12, color: '#1976D2', lineHeight: 17 },

  itemCard: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.md, ...Shadow.sm,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
  },
  itemIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primarySurface, alignItems: 'center', justifyContent: 'center' },
  itemName: { flex: 1, fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  qty: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, minWidth: 22, textAlign: 'center' },
  removeBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: Colors.errorSurface, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },

  footer: { gap: Spacing.md, marginTop: Spacing.md },
  addressLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  addressInputWrap: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.lg,
    padding: Spacing.md, backgroundColor: Colors.white,
  },
  addressInput: {
    flex: 1, fontSize: 14, color: Colors.textPrimary,
    minHeight: 50, textAlignVertical: 'top',
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, borderRadius: Radius.lg, height: 54, ...Shadow.md,
  },
  submitBtnTxt: { fontSize: 16, fontWeight: '700', color: Colors.white },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  emptyIconBox: { width: 96, height: 96, borderRadius: 28, backgroundColor: Colors.primarySurface, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: 14, color: Colors.textHint, textAlign: 'center', lineHeight: 20 },
  searchBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: 13, borderRadius: Radius.full, marginTop: Spacing.sm, ...Shadow.sm },
  searchBtnTxt: { fontSize: 15, fontWeight: '700', color: Colors.white },
});
