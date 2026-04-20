import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, Animated, Pressable,
  TouchableOpacity, TextInput, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../theme';
import { ordersApi } from '../../api/orders';
import { useTranslation } from '../../i18n';
import { haptics } from '../../utils/haptics';

type Props = {
  visible: boolean;
  orderId: string | null;
  orderTotal: number;
  onClose: () => void;
  onSubmitted?: () => void;
};

export default function CashSubmissionSheet({
  visible, orderId, orderTotal, onClose, onSubmitted,
}: Props) {
  const { lang } = useTranslation();
  const slideY = useRef(new Animated.Value(600)).current;
  const bg = useRef(new Animated.Value(0)).current;

  const [paidAmount, setPaidAmount] = useState('');
  const [customerRequested, setCustomerRequested] = useState(true);
  const [loading, setLoading] = useState(false);

  const paid = Number(paidAmount.replace(/\s/g, ''));
  const change = Number.isFinite(paid) ? paid - orderTotal : 0;

  useEffect(() => {
    if (visible) {
      setPaidAmount('');
      setCustomerRequested(true);
      Animated.parallel([
        Animated.timing(bg, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideY, { toValue: 0, friction: 8, tension: 70, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(bg, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideY, { toValue: 600, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleSubmit = async (skip: boolean) => {
    if (!orderId) return;
    if (!skip) {
      if (!paidAmount) {
        haptics.warning();
        Alert.alert(
          lang === 'ru' ? 'Сумма пустая' : 'Summa bo\'sh',
          lang === 'ru' ? 'Введите сумму или пропустите' : "Summa kiriting yoki o'tkazib yuboring",
        );
        return;
      }
      if (paid < orderTotal) {
        haptics.error();
        Alert.alert(
          lang === 'ru' ? 'Неверная сумма' : "Noto'g'ri summa",
          lang === 'ru'
            ? `Сумма не может быть меньше ${orderTotal.toLocaleString()} сум`
            : `Summa ${orderTotal.toLocaleString()} so'mdan kam bo'lishi mumkin emas`,
        );
        return;
      }
    }

    setLoading(true);
    haptics.medium();
    try {
      await ordersApi.submitDeliveryCash(orderId, {
        paid_amount: skip ? null : paid,
        customer_requested_change: !skip && customerRequested && change > 0,
      });
      haptics.success();
      onSubmitted?.();
      onClose();
    } catch (e: any) {
      haptics.error();
      Alert.alert(
        lang === 'ru' ? 'Ошибка' : 'Xato',
        e?.response?.data?.message ?? (lang === 'ru' ? 'Ошибка' : 'Xato'),
      );
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      <Animated.View style={[s.backdrop, { opacity: bg }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[s.sheet, { transform: [{ translateY: slideY }] }]}>
        <View style={s.handle} />

        <Text style={s.title}>
          {lang === 'ru' ? 'Наличный расчёт' : 'Naqd hisob-kitob'}
        </Text>
        <Text style={s.sub}>
          {lang === 'ru'
            ? `Заказ: ${orderTotal.toLocaleString()} сум`
            : `Buyurtma: ${orderTotal.toLocaleString()} so'm`}
        </Text>

        {/* Paid amount input */}
        <View style={s.inputBlock}>
          <Text style={s.label}>
            {lang === 'ru' ? 'Сколько вы получили наличными?' : 'Qancha naqd oldingiz?'}
          </Text>
          <View style={s.inputWrap}>
            <TextInput
              style={s.input}
              value={paidAmount}
              onChangeText={(v) => setPaidAmount(v.replace(/[^0-9]/g, ''))}
              placeholder="0"
              placeholderTextColor={Colors.textHint}
              keyboardType="number-pad"
              autoFocus
            />
            <Text style={s.currency}>so'm</Text>
          </View>

          {/* Change display */}
          {paid > 0 && change > 0 && (
            <View style={s.changeRow}>
              <Ionicons name="swap-horizontal" size={14} color={Colors.primary} />
              <Text style={s.changeTxt}>
                {lang === 'ru' ? 'Сдача' : 'Qaytim'}:{' '}
                <Text style={s.changeAmount}>
                  {change.toLocaleString()} so'm
                </Text>
              </Text>
            </View>
          )}
          {paid > 0 && change === 0 && (
            <Text style={s.exactTxt}>
              ✓ {lang === 'ru' ? 'Точная сумма' : 'Aniq summa'}
            </Text>
          )}
          {paid > 0 && change < 0 && (
            <Text style={s.errorTxt}>
              {lang === 'ru' ? 'Сумма меньше заказа' : 'Summa buyurtmadan kam'}
            </Text>
          )}
        </View>

        {/* Customer requests change toggle */}
        {change > 0 && (
          <TouchableOpacity
            style={s.toggleRow}
            onPress={() => { haptics.select(); setCustomerRequested(v => !v); }}
            activeOpacity={0.85}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.toggleLabel}>
                {lang === 'ru'
                  ? 'Клиент просит сдачу?'
                  : 'Mijoz qaytim so\'radimi?'}
              </Text>
              <Text style={s.toggleSub}>
                {customerRequested
                  ? (lang === 'ru' ? 'Да — переведём из баланса магазина' : "Ha — do'kon balansidan o'tkaziladi")
                  : (lang === 'ru' ? 'Нет — сдача остаётся у магазина' : "Yo'q — qaytim do'konda qoladi")}
              </Text>
            </View>
            <View style={[s.switch, customerRequested && s.switchActive]}>
              <View style={[s.switchDot, customerRequested && s.switchDotActive]} />
            </View>
          </TouchableOpacity>
        )}

        {/* Buttons */}
        <View style={s.btnRow}>
          <TouchableOpacity
            style={[s.btn, s.btnSkip]}
            onPress={() => handleSubmit(true)}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={s.btnSkipTxt}>
              {lang === 'ru' ? 'Пропустить' : "O'tkazib yuborish"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.btn, s.btnConfirm, loading && { opacity: 0.5 }]}
            onPress={() => handleSubmit(false)}
            disabled={loading || !paidAmount}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
                <Text style={s.btnConfirmTxt}>
                  {lang === 'ru' ? 'Сохранить' : 'Saqlash'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={s.hint}>
          {lang === 'ru'
            ? 'Если пропустить — списывается стандартная стоимость заказа'
            : "O'tkazib yuborsangiz — standart buyurtma narxi hisoblanadi"}
        </Text>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    ...Shadow.lg,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.divider, alignSelf: 'center', marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  sub: { fontSize: 13, color: Colors.textHint, textAlign: 'center', marginTop: 4 },

  inputBlock: { marginTop: Spacing.md, gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    height: 56,
  },
  input: { flex: 1, fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  currency: { fontSize: 14, fontWeight: '600', color: Colors.textHint },

  changeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primarySurface,
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  changeTxt: { fontSize: 13, color: Colors.primary, fontWeight: '500' },
  changeAmount: { fontWeight: '800' },
  exactTxt: { fontSize: 13, fontWeight: '700', color: Colors.success, paddingLeft: 4 },
  errorTxt: { fontSize: 13, fontWeight: '700', color: Colors.error, paddingLeft: 4 },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  toggleSub: { fontSize: 11, color: Colors.textHint, marginTop: 3, lineHeight: 15 },
  switch: {
    width: 44, height: 26, borderRadius: 13,
    backgroundColor: Colors.divider, padding: 3, justifyContent: 'center',
  },
  switchActive: { backgroundColor: Colors.primary },
  switchDot: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.white, ...Shadow.sm,
  },
  switchDotActive: { alignSelf: 'flex-end' },

  btnRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  btn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 50, borderRadius: Radius.lg, gap: 6,
  },
  btnSkip: { backgroundColor: Colors.background, borderWidth: 1.5, borderColor: Colors.border },
  btnSkipTxt: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  btnConfirm: { backgroundColor: Colors.primary, ...Shadow.sm },
  btnConfirmTxt: { fontSize: 14, fontWeight: '700', color: Colors.white },

  hint: { fontSize: 11, color: Colors.textHint, textAlign: 'center', marginTop: Spacing.sm, paddingHorizontal: Spacing.md },
});
