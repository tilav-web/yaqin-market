import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../../src/theme';
import { Button, Input } from '../../../src/components/ui';
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
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selectedItems.size === 0) {
      Alert.alert('Xato', 'Kamida bitta mahsulot tanlang');
      return;
    }

    const items = Array.from(selectedItems).map((itemId) => ({
      request_item_id: itemId,
      unit_price: Number(prices[itemId] ?? 0),
    }));

    const invalidPrice = items.find(i => i.unit_price <= 0);
    if (invalidPrice) {
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
      Alert.alert('✅', 'Taklifingiz yuborildi!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Xato', err?.response?.data?.message ?? 'Xato yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ flex: 1 }} color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Orqaga</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Taklif yuborish</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Buyurtma tafsilotlari</Text>
          <Text style={styles.deliveryAddr}>📍 {request?.delivery_address}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Qaysi mahsulotlarni yetkazib bera olasiz?
          </Text>
          <Text style={styles.hint}>Har bir tanlangan mahsulot uchun narx kiriting</Text>

          {request?.items?.map((item: any) => (
            <View key={item.id} style={styles.itemCard}>
              <TouchableOpacity
                style={styles.itemRow}
                onPress={() => toggleItem(item.id)}
              >
                <View style={[styles.checkbox, selectedItems.has(item.id) && styles.checkboxActive]}>
                  {selectedItems.has(item.id) && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.product_name}</Text>
                  <Text style={styles.itemQty}>Miqdor: {item.quantity} ta</Text>
                </View>
              </TouchableOpacity>

              {selectedItems.has(item.id) && (
                <View style={styles.priceInput}>
                  <TextInput
                    style={styles.priceField}
                    placeholder="Narx (so'm)"
                    placeholderTextColor={Colors.textHint}
                    keyboardType="numeric"
                    value={prices[item.id] ?? ''}
                    onChangeText={(val) =>
                      setPrices((prev) => ({ ...prev, [item.id]: val }))
                    }
                  />
                  <Text style={styles.currency}>so'm / dona</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yetkazib berish</Text>
          <View style={styles.row}>
            <Input
              label="Yetkazib berish narxi (so'm)"
              value={deliveryPrice}
              onChangeText={setDeliveryPrice}
              keyboardType="numeric"
              containerStyle={styles.halfInput}
            />
            <Input
              label="Taxminiy vaqt (daqiqa)"
              value={estimatedMinutes}
              onChangeText={setEstimatedMinutes}
              keyboardType="numeric"
              containerStyle={styles.halfInput}
            />
          </View>
          <Input
            label="Xabar (ixtiyoriy)"
            value={message}
            onChangeText={setMessage}
            placeholder="Mijozga qo'shimcha ma'lumot..."
            multiline
          />
        </View>

        <View style={styles.actions}>
          <Button
            title={`Taklif yuborish (${selectedItems.size} ta mahsulot)`}
            onPress={handleSubmit}
            loading={loading}
            disabled={selectedItems.size === 0}
            size="lg"
          />
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  back: { color: Colors.white, ...Typography.body },
  headerTitle: { ...Typography.title, color: Colors.white, flex: 1 },
  scroll: { flex: 1 },
  section: {
    backgroundColor: Colors.white,
    margin: Spacing.md,
    marginBottom: 0,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadow.sm,
    gap: Spacing.sm,
  },
  sectionTitle: { ...Typography.title },
  deliveryAddr: { ...Typography.bodySmall, color: Colors.textSecondary },
  hint: { ...Typography.caption, color: Colors.textHint },
  itemCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  checkmark: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  itemInfo: { flex: 1 },
  itemName: { ...Typography.bodySmall, fontWeight: '500' },
  itemQty: { ...Typography.caption, color: Colors.textHint, marginTop: 2 },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primarySurface,
    padding: Spacing.sm,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.primaryBorder,
  },
  priceField: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    ...Typography.body,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
  },
  currency: { ...Typography.caption, color: Colors.primary },
  row: { flexDirection: 'row', gap: Spacing.sm },
  halfInput: { flex: 1 },
  actions: { padding: Spacing.md },
});
