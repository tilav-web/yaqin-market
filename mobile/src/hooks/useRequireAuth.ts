import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/auth.store';
import { useTranslation } from '../i18n';

/**
 * Login talab qiladigan amallar uchun. Agar user login bo'lmagan bo'lsa,
 * chiroyli dialog ko'rsatadi va "Kirish" bosilsa login sahifasiga yuboradi.
 * Dialog ko'rsatilsa `false` qaytaradi; auth bo'lsa `true`.
 */
export function useRequireAuth() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { tr } = useTranslation();

  return (options?: { title?: string; message?: string }) => {
    if (isAuthenticated) return true;

    Alert.alert(
      options?.title ?? tr('auth_required_title'),
      options?.message ?? tr('auth_required_msg'),
      [
        { text: tr('cancel'), style: 'cancel' },
        {
          text: tr('login'),
          style: 'default',
          onPress: () => router.push('/(auth)/login'),
        },
      ],
    );
    return false;
  };
}
