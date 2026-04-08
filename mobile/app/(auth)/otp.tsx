import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../src/theme';
import { Button } from '../../src/components/ui';
import { authApi } from '../../src/api/auth';
import { useAuthStore } from '../../src/store/auth.store';
import { useTranslation } from '../../src/i18n';

const OTP_LENGTH = 6;

export default function OtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    phone: string;
    channel: string;
    preview_otp: string;
  }>();
  const { setTokens, setRole } = useAuthStore();
  const { lang, tr } = useTranslation();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(60);
  const inputs = useRef<(TextInput | null)[]>([]);

  // Auto-fill preview OTP in dev
  useEffect(() => {
    if (params.preview_otp && params.preview_otp.length === OTP_LENGTH) {
      const digits = params.preview_otp.split('');
      setOtp(digits);
    }
  }, [params.preview_otp]);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (text: string, index: number) => {
    setError('');
    const digit = text.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }

    // Auto-verify when all filled
    if (digit && index === OTP_LENGTH - 1) {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === OTP_LENGTH) {
        handleVerify(fullOtp);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code?: string) => {
    const finalOtp = code ?? otp.join('');
    if (finalOtp.length < OTP_LENGTH) {
      setError(lang === 'ru' ? 'Введите полный код' : "To'liq kodni kiriting");
      return;
    }

    setLoading(true);
    try {
      const result = await authApi.verifyOtp(params.phone, finalOtp);

      // Save tokens
      await setTokens(result.access_token, result.refresh_token);

      // Get user info to determine role
      const me = await authApi.getMe();
      const role = me?.role ?? 'CUSTOMER';
      const userId = me?.user?.id ?? result.userId;

      await SecureStore.setItemAsync('role', role);
      await SecureStore.setItemAsync('user_id', userId ?? '');
      setRole(role, userId);

      // All roles go to customer home; panels accessible via profile
      router.replace('/(customer)/home');
    } catch (err: any) {
      const fallback = lang === 'ru' ? 'Неверный код. Попробуйте ещё раз' : 'Noto\'g\'ri kod. Qayta urinib ko\'ring';
      const msg =
        err?.response?.data?.message ?? fallback;
      setError(Array.isArray(msg) ? msg[0] : msg);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const channelText = lang === 'ru'
    ? ({
        telegram: 'В Telegram-бот',
        sms: 'По SMS',
        preview: 'Тест (авто)',
      }[params.channel] ?? 'На ваш телефон')
    : ({
        telegram: 'Telegram botga',
        sms: 'SMS orqali',
        preview: 'Test (avtomatik)',
      }[params.channel] ?? 'Telefoningizga');

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>← {tr('back')}</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed-outline" size={36} color={Colors.primary} />
          </View>
          <Text style={styles.title}>{lang === 'ru' ? 'Введите код' : 'Kodni kiriting'}</Text>
          <Text style={styles.subtitle}>
            {channelText} +998 {params.phone} {tr('otp_sent_to')}
          </Text>
        </View>

        {/* OTP Inputs */}
        <View style={styles.otpRow}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputs.current[index] = ref; }}
              style={[
                styles.otpCell,
                digit && styles.otpCellFilled,
                !!error && styles.otpCellError,
              ]}
              value={digit}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <Button
            title={tr('verify')}
            onPress={() => handleVerify()}
            loading={loading}
            disabled={otp.join('').length < OTP_LENGTH}
            size="lg"
          />

          {timer > 0 ? (
            <Text style={styles.timerText}>
              {tr('resend_in')}: {timer}s
            </Text>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setTimer(60);
                authApi.sendOtp(params.phone);
              }}
            >
              <Text style={styles.resendText}>{lang === 'ru' ? 'Отправить код повторно' : 'Kodni qayta yuborish'}</Text>
            </TouchableOpacity>
          )}
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
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
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
    lineHeight: 20,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  otpCell: {
    width: 48,
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  otpCellFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySurface,
  },
  otpCellError: { borderColor: Colors.error },
  error: {
    ...Typography.caption,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  actions: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    alignItems: 'center',
  },
  timerText: { ...Typography.bodySmall, color: Colors.textHint },
  resendText: { ...Typography.bodySmall, color: Colors.primary, fontWeight: '600' },
});
