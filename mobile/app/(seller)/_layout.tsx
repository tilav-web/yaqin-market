import { Tabs } from 'expo-router';
import { BottomTabIcon, bottomTabBarStyle } from '../../src/components/navigation/BottomTabIcon';
import { Colors } from '../../src/theme';

export default function SellerLayout() {
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
        name="dashboard"
        options={{
          tabBarIcon: ({ focused }) => (
            <BottomTabIcon
              accentColor={Colors.primary}
              iconActive="grid"
              iconInactive="grid-outline"
              label="Bosh"
              focused={focused}
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
        name="broadcast-feed"
        options={{
          tabBarIcon: ({ focused }) => (
            <BottomTabIcon
              accentColor={Colors.primary}
              iconActive="megaphone"
              iconInactive="megaphone-outline"
              label="Umumiy"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          tabBarIcon: ({ focused }) => (
            <BottomTabIcon
              accentColor={Colors.primary}
              iconActive="bag"
              iconInactive="bag-outline"
              label="Mahsulot"
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
