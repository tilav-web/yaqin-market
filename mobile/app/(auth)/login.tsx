import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius } from '../../src/theme';
import { Button, Input } from '../../src/components/ui';
import { authApi } from '../../src/api/auth';
import { useTranslation } from '../../src/i18n';

export default function LoginScreen() {
  const router = useRouter();
  const { lang, tr } = useTranslation();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatPhone = (text: string) => {
    const digits = text.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
  };

  const handlePhoneChange = (text: string) => {
    setError('');
    const digits = text.replace(/\D/g, '');
    if (digits.length <= 9) {
      setPhone(formatPhone(digits));
    }
  };

  const handleSendOtp = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 9) {
      setError(lang === 'ru' ? 'Введите полный номер телефона' : "To'liq telefon raqam kiriting");
      return;
    }

    setLoading(true);
    try {
      const result = await authApi.sendOtp(digits);
      router.push({
        pathname: '/(auth)/otp',
        params: {
          phone: digits,
          channel: result.delivery_channel,
          preview_otp: result.otp_preview ?? '',
        },
      });
    } catch (err: any) {
      const fallback = lang === 'ru' ? 'Ошибка. Попробуйте ещё раз' : "Xato yuz berdi. Qayta urinib ko'ring";
      const msg = err?.response?.data?.message ?? fallback;
      setError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        {/* Back */}
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>← {tr('back')}</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="phone-portrait-outline" size={36} color={Colors.primary} />
          </View>
          <Text style={styles.title}>{lang === 'ru' ? 'Введите номер телефона' : 'Telefon raqamingizni kiriting'}</Text>
          <Text style={styles.subtitle}>
            {lang === 'ru' ? 'На номер будет отправлен OTP-код' : 'Raqamga OTP kod yuboriladi'}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.phoneRow}>
            <View style={styles.prefix}>
              <Text style={styles.flag}>🇺🇿</Text>
              <Text style={styles.prefixText}>+998</Text>
            </View>
            <View style={styles.phoneInput}>
              <Input
                value={phone}
                onChangeText={handlePhoneChange}
                placeholder={tr('phone_placeholder')}
                keyboardType="phone-pad"
                error={error}
                autoFocus
                containerStyle={styles.inputContainer}
              />
            </View>
          </View>

          <Text style={styles.hint}>
            {lang === 'ru' ? 'Если ваш Telegram-бот подключён, код будет отправлен через Telegram' : "Agar Telegram botingiz ulangan bo'lsa, kod Telegram orqali yuboriladi"}
          </Text>

          <Button
            title={tr('send_code')}
            onPress={handleSendOtp}
            loading={loading}
            disabled={phone.replace(/\D/g, '').length < 9}
            size="lg"
            style={styles.button}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  flex: { flex: 1 },
  back: { padding: Spacing.md },
  backText: { ...Typography.body, color: Colors.primary },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: { ...Typography.h3, textAlign: 'center', marginBottom: Spacing.xs },
  subtitle: {
    ...Typography.bodySmall,
    textAlign: 'center',
    color: Colors.textSecondary,
  },
  form: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  prefix: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    gap: Spacing.xs,
  },
  flag: { fontSize: 18 },
  prefixText: { ...Typography.body, fontWeight: '600' },
  phoneInput: { flex: 1 },
  inputContainer: { marginBottom: 0 },
  hint: {
    ...Typography.caption,
    color: Colors.textHint,
    textAlign: 'center',
    lineHeight: 18,
  },
  button: { marginTop: Spacing.sm },
});
