import { Tabs } from 'expo-router';
import { CustomTabBar } from '../../src/components/navigation/CustomTabBar';
import { Colors } from '../../src/theme';
import { useCartStore } from '../../src/store/cart.store';
import { useTranslation } from '../../src/i18n';

export default function CustomerLayout() {
  const cartCount = useCartStore((s) => {
    const storeCount = Object.values(s.storeCarts).reduce(
      (sum, c) => sum + c.items.length,
      0,
    );
    return storeCount + s.broadcastItems.length;
  });
  const { tr } = useTranslation();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <CustomTabBar
          {...props}
          accentColor={Colors.primary}
          tabs={[
            { name: 'home',    label: tr('tab_home'),    icon: 'home-outline',   iconFocused: 'home' },
            { name: 'search',  label: tr('tab_search'),  icon: 'search-outline', iconFocused: 'search' },
            { name: 'cart',    label: tr('tab_cart'),    icon: 'cart-outline',   iconFocused: 'cart', badge: cartCount },
            { name: 'orders',  label: tr('tab_orders'),  icon: 'cube-outline',   iconFocused: 'cube' },
            { name: 'profile', label: tr('tab_profile'), icon: 'person-outline', iconFocused: 'person' },
          ]}
        />
      )}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="cart" />
      <Tabs.Screen name="orders" />
      <Tabs.Screen name="profile" />
      {/* Tab bar da ko'rinmaydigan sahifalar */}
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
      <Tabs.Screen name="my-locations" options={{ href: null }} />
      <Tabs.Screen name="stores-map" options={{ href: null }} />
      <Tabs.Screen name="help" options={{ href: null }} />
      <Tabs.Screen name="about" options={{ href: null }} />
      <Tabs.Screen name="apply-seller" options={{ href: null }} />
      <Tabs.Screen name="apply-courier" options={{ href: null }} />
      <Tabs.Screen name="broadcast-cart" options={{ href: null }} />
      <Tabs.Screen name="store/[id]" options={{ href: null }} />
      <Tabs.Screen name="order/[id]" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="wallet" options={{ href: null }} />
    </Tabs>
  );
}
