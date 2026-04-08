import { Tabs } from 'expo-router';
import { CustomTabBar } from '../../src/components/navigation/CustomTabBar';
import { Colors } from '../../src/theme';
import { useCartStore } from '../../src/store/cart.store';
import { useTranslation } from '../../src/i18n';

export default function CustomerLayout() {
  const cartCount =
    useCartStore(s => s.directItems.length) +
    useCartStore(s => s.broadcastItems.length);
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
    </Tabs>
  );
}
