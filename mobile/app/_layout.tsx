import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../src/store/auth.store';
import { usePushNotifications } from '../src/hooks/usePushNotifications';
import { Colors } from '../src/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 * 2 },
  },
});

function PushNotificationsSetup() {
  usePushNotifications();
  return null;
}

function AuthGuard() {
  const { isAuthenticated, isLoading, role, loadFromStorage } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (isAuthenticated && inAuthGroup) {
      // Route based on role
      switch (role) {
        case 'SELLER':
          router.replace('/(seller)/dashboard');
          break;
        case 'COURIER':
          router.replace('/(courier)/nearby');
          break;
        default:
          router.replace('/(customer)/home');
      }
    }
  }, [isAuthenticated, isLoading, role]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" backgroundColor={Colors.primary} />
        <PushNotificationsSetup />
        <AuthGuard />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(customer)" />
          <Stack.Screen name="(seller)" />
          <Stack.Screen name="(courier)" />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
