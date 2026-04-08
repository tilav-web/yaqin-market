import { Tabs } from 'expo-router';
import { BottomTabIcon, bottomTabBarStyle } from '../../src/components/navigation/BottomTabIcon';
import { Colors } from '../../src/theme';
import { useCartStore } from '../../src/store/cart.store';

export default function CustomerLayout() {
  const cartCount =
    useCartStore(s => s.directItems.length) +
    useCartStore(s => s.broadcastItems.length);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: bottomTabBarStyle.bar,
        tabBarShowLabel: false,
        tabBarItemStyle: bottomTabBarStyle.item,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => (
            <BottomTabIcon
              accentColor={Colors.primary}
              iconActive="home"
              iconInactive="home-outline"
              label="Bosh"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          tabBarIcon: ({ focused }) => (
            <BottomTabIcon
              accentColor={Colors.primary}
              iconActive="search"
              iconInactive="search-outline"
              label="Izla"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          tabBarIcon: ({ focused }) => (
            <BottomTabIcon
              accentColor={Colors.primary}
              iconActive="cart"
              iconInactive="cart-outline"
              label="Savat"
              focused={focused}
              badge={cartCount}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          tabBarIcon: ({ focused }) => (
            <BottomTabIcon
              accentColor={Colors.primary}
              iconActive="cube"
              iconInactive="cube-outline"
              label="Buyurtma"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <BottomTabIcon
              accentColor={Colors.primary}
              iconActive="person"
              iconInactive="person-outline"
              label="Profil"
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}
