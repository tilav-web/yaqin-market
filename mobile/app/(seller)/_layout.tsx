import { Tabs } from 'expo-router';
import { CustomTabBar } from '../../src/components/navigation/CustomTabBar';
import { Colors } from '../../src/theme';

export default function SellerLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <CustomTabBar
          {...props}
          accentColor={Colors.primary}
          tabs={[
            { name: 'dashboard',      label: 'Bosh',    icon: 'grid-outline',      iconFocused: 'grid' },
            { name: 'orders',         label: 'Buyurtma', icon: 'cube-outline',     iconFocused: 'cube' },
            { name: 'broadcast-feed', label: 'Umumiy',  icon: 'megaphone-outline', iconFocused: 'megaphone' },
            { name: 'products',       label: 'Tovar',   icon: 'bag-outline',       iconFocused: 'bag' },
            { name: 'profile',        label: 'Profil',  icon: 'person-outline',    iconFocused: 'person' },
          ]}
        />
      )}
    >
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="orders" />
      <Tabs.Screen name="broadcast-feed" />
      <Tabs.Screen name="products" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="delivery-settings" options={{ href: null }} />
      <Tabs.Screen name="staff" options={{ href: null }} />
    </Tabs>
  );
}
