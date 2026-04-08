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

// Public customer routes — accessible without login
const PUBLIC_CUSTOMER_PAGES = ['home', 'search'];

function PushNotificationsSetup() {
  usePushNotifications();
  return null;
}

function AuthGuard() {
  const { isAuthenticated, isLoading, loadFromStorage } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const group = segments[0] as string | undefined;
    const page  = (segments as string[])[1] as string | undefined;

    const inAuthGroup     = group === '(auth)';
    const inCustomerGroup = group === '(customer)';
    const isPublicPage    = PUBLIC_CUSTOMER_PAGES.includes(page ?? '');

    if (isAuthenticated && inAuthGroup) {
      // After login → always go to customer home, regardless of role
      // Seller/Courier access their panels via the profile screen
      router.replace('/(customer)/home');
      return;
    }

    if (!isAuthenticated && !inAuthGroup) {
      // Allow unauthenticated users to browse public customer pages
      if (inCustomerGroup && isPublicPage) return;
      // Everything else requires login
      router.replace('/(auth)/welcome');
    }
  }, [isAuthenticated, isLoading, segments]);

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
