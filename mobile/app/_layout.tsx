import { useEffect } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
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
  const { isAuthenticated, isLoading, loadFromStorage } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  const navState = useRootNavigationState();

  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    if (!navState?.key) return; // navigation not mounted yet
    if (isLoading) return;

    const group = segments[0] as string | undefined;

    const inAuthGroup     = group === '(auth)';
    const inCustomerGroup = group === '(customer)';
    const inSellerGroup   = group === '(seller)';
    const inCourierGroup  = group === '(courier)';

    // Authenticated user on auth pages (login/otp) → go to home
    if (isAuthenticated && inAuthGroup) {
      router.replace('/(customer)/home');
      return;
    }

    // Auth pages — always accessible
    if (inAuthGroup) return;

    // All customer pages — always accessible (individual screens handle auth)
    if (inCustomerGroup) return;

    // Seller / courier panels — require login
    if (inSellerGroup || inCourierGroup) {
      if (!isAuthenticated) {
        router.replace('/(auth)/login');
      }
      return;
    }

    // No route matched (initial load) → customer home
    router.replace('/(customer)/home');
  }, [isAuthenticated, isLoading, segments, navState?.key]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" backgroundColor={Colors.primary} translucent={false} />
        <PushNotificationsSetup />
        <AuthGuard />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade_from_bottom',
            animationDuration: 220,
            contentStyle: { backgroundColor: Colors.background },
          }}
        >
          <Stack.Screen
            name="(auth)"
            options={{ animation: 'fade', animationDuration: 180 }}
          />
          <Stack.Screen
            name="(customer)"
            options={{ animation: 'none' }}
          />
          <Stack.Screen
            name="(seller)"
            options={{ animation: 'none' }}
          />
          <Stack.Screen
            name="(courier)"
            options={{ animation: 'none' }}
          />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
