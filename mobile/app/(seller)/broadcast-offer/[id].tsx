import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, TextInput, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../../src/theme';
import { ordersApi } from '../../../src/api/orders';

export default function BroadcastOfferScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: request, isLoading } = useQuery({
    queryKey: ['broadcast-request-seller', id],
    queryFn: () => ordersApi.getBroadcastRequestById(id),
  });

  const [prices, setPrices] = useState<Record<string, string>>({});
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [deliveryPrice, setDeliveryPrice] = useState('0');
  const [estimatedMinutes, setEstimatedMinutes] = useState('30');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selectedItems.size === 0) { Alert.alert('Xato', 'Kamida bitta mahsulot tanlang'); return; }
    const items = Array.from(selectedItems).map((itemId) => ({
      request_item_id: itemId,
      unit_price: Number(prices[itemId] ?? 0),
    }));
    if (items.find(i => i.unit_price <= 0)) {
      Alert.alert('Xato', 'Barcha tanlangan mahsulotlar uchun narx kiriting');
      return;
    }
    setLoading(true);
    try {
      await ordersApi.createBroadcastOffer(id, {
        items,
        delivery_price: Number(deliveryPrice),
        estimated_minutes: Number(estimatedMinutes),
        message: message.trim() || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['broadcast-feed'] });
      Alert.alert('Yuborildi!', 'Taklifingiz muvaffaqiyatli yuborildi!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Xato', err?.response?.data?.message ?? 'Xato yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return <SafeAreaView style={s.safe}><ActivityIndicator style={{ flex: 1 }} color={Colors.primary} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Taklif yuborish</Text>
          <Text style={s.headerSub}>{request?.items?.length ?? 0} ta mahsulot so'ralgan</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Delivery address */}
        <View style={s.card}>
          <View style={s.infoRow}>
            <View style={[s.iconBox, { backgroundColor: Colors.primarySurface }]}>
              <Ionicons name="location-outline" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.infoLabel}>Yetkazib berish manzili</Text>
              <Text style={s.infoVal}>{request?.delivery_address}</Text>
            </View>
          </View>
        </View>

        {/* Items selection */}
        <View style={s.card}>
          <View style={s.cardHeaderRow}>
            <View style={[s.iconBox, { backgroundColor: Colors.primarySurface }]}>
              <Ionicons name="cube-outline" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>Qaysi mahsulotlarni yetkazib bera olasiz?</Text>
              <Text style={s.cardHint}>Har bir tanlangan uchun narx kiriting</Text>
            </View>
          </View>

          {request?.items?.map((item: any) => (
            <View key={item.id} style={[s.itemCard, selectedItems.has(item.id) && s.itemCardActive]}>
              <TouchableOpacity style={s.itemRow} onPress={() => toggleItem(item.id)} activeOpacity={0.7}>
                <View style={[s.checkbox, selectedItems.has(item.id) && s.checkboxActive]}>
                  {selectedItems.has(item.id) && <Ionicons name="checkmark" size={12} color={Colors.white} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemName}>{item.product_name}</Text>
                  <Text style={s.itemQty}>{item.quantity} ta so'ralmoqda</Text>
                </View>
              </TouchableOpacity>

              {selectedItems.has(item.id) && (
                <View style={s.priceInputRow}>
                  <Ionicons name="pricetag-outline" size={16} color={Colors.primary} />
                  <TextInput
                    style={s.priceField}
                    placeholder="Narx kiriting..."
                    placeholderTextColor={Colors.textHint}
                    keyboardType="numeric"
                    value={prices[item.id] ?? ''}
                    onChangeText={(val) => setPrices((prev) => ({ ...prev, [item.id]: val }))}
                  />
                  <Text style={s.currency}>so'm/dona</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Delivery details */}
        <View style={s.card}>
          <View style={s.cardHeaderRow}>
            <View style={[s.iconBox, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="car-outline" size={18} color="#2196F3" />
            </View>
            <Text style={s.cardTitle}>Yetkazib berish</Text>
          </View>

          <View style={s.twoColRow}>
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>Narxi (so'm)</Text>
              <View style={s.fieldInputWrap}>
                <TextInput
                  style={s.fieldInput}
                  value={deliveryPrice}
                  onChangeText={setDeliveryPrice}
                  keyboardType="numeric"
                  placeholderTextColor={Colors.textHint}
                />
              </View>
            </View>
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>Taxminiy vaqt (daqiqa)</Text>
              <View style={s.fieldInputWrap}>
                <TextInput
                  style={s.fieldInput}
                  value={estimatedMinutes}
                  onChangeText={setEstimatedMinutes}
                  keyboardType="numeric"
                  placeholderTextColor={Colors.textHint}
                />
              </View>
            </View>
          </View>

          <View>
            <Text style={s.fieldLabel}>Xabar (ixtiyoriy)</Text>
            <View style={[s.fieldInputWrap, { minHeight: 60 }]}>
              <TextInput
                style={[s.fieldInput, { textAlignVertical: 'top', minHeight: 50 }]}
                value={message}
                onChangeText={setMessage}
                placeholder="Mijozga qo'shimcha ma'lumot..."
                placeholderTextColor={Colors.textHint}
                multiline
              />
            </View>
          </View>
        </View>

        {/* Submit */}
        <View style={{ paddingHorizontal: Spacing.md }}>
          <TouchableOpacity
            style={[s.submitBtn, (loading || selectedItems.size === 0) && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading || selectedItems.size === 0}
            activeOpacity={0.85}
          >
            <Ionicons name="paper-plane-outline" size={20} color={Colors.white} />
            <Text style={s.submitBtnTxt}>
              {loading ? 'Yuborilmoqda...' : `Taklif yuborish (${selectedItems.size} ta)`}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
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

  scroll: { flex: 1, backgroundColor: Colors.background },
  card: { backgroundColor: Colors.white, marginHorizontal: Spacing.md, marginTop: Spacing.sm, borderRadius: Radius.lg, padding: Spacing.md, ...Shadow.sm, gap: Spacing.sm },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  cardHint: { fontSize: 11, color: Colors.textHint, marginTop: 2 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  infoLabel: { fontSize: 11, fontWeight: '600', color: Colors.textHint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  infoVal: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },

  itemCard: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, overflow: 'hidden' },
  itemCardActive: { borderColor: Colors.primary },
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.sm, gap: Spacing.sm },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  itemName: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
  itemQty: { fontSize: 11, color: Colors.textHint, marginTop: 1 },
  priceInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primarySurface, padding: Spacing.sm,
    borderTopWidth: 1, borderTopColor: Colors.primaryBorder,
  },
  priceField: { flex: 1, height: 36, borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, fontSize: 14, color: Colors.textPrimary, backgroundColor: Colors.white },
  currency: { fontSize: 11, color: Colors.primary, fontWeight: '600' },

  twoColRow: { flexDirection: 'row', gap: Spacing.sm },
  fieldWrap: { flex: 1, gap: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  fieldInputWrap: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.background, paddingHorizontal: Spacing.sm },
  fieldInput: { fontSize: 14, color: Colors.textPrimary, height: 44 },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: Radius.lg, height: 54, marginTop: Spacing.md, ...Shadow.md },
  submitBtnTxt: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
