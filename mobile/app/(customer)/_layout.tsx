import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '../../src/theme';
import { useCartStore } from '../../src/store/cart.store';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  iconActive,
  iconInactive,
  label,
  focused,
  badge,
}: {
  iconActive: IoniconsName;
  iconInactive: IoniconsName;
  label: string;
  focused: boolean;
  badge?: number;
}) {
  return (
    <View style={tabStyles.wrap}>
      <View style={[tabStyles.pill, focused && tabStyles.pillActive]}>
        <Ionicons
          name={focused ? iconActive : iconInactive}
          size={21}
          color={focused ? Colors.white : Colors.textHint}
        />
        {badge != null && badge > 0 && (
          <View style={tabStyles.badge}>
            <Text style={tabStyles.badgeTxt}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={[tabStyles.label, focused && tabStyles.labelActive]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export default function CustomerLayout() {
  const cartCount =
    useCartStore(s => s.directItems.length) +
    useCartStore(s => s.broadcastItems.length);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: tabStyles.bar,
        tabBarShowLabel: false,
        tabBarItemStyle: { flex: 1 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconActive="home" iconInactive="home-outline" label="Bosh" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconActive="search" iconInactive="search-outline" label="Izla" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconActive="cart" iconInactive="cart-outline" label="Savat" focused={focused} badge={cartCount} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconActive="cube" iconInactive="cube-outline" label="Buyurtma" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconActive="person" iconInactive="person-outline" label="Profil" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    height: Platform.OS === 'ios' ? 82 : 64,
    paddingBottom: Platform.OS === 'ios' ? 22 : 4,
    paddingTop: 6,
    backgroundColor: Colors.white,
    borderTopWidth: 0,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
  },
  wrap: { alignItems: 'center', gap: 3, minWidth: 52 },
  pill: {
    width: 46,
    height: 30,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  label: { fontSize: 9, color: Colors.textHint, fontWeight: '500', letterSpacing: 0.1 },
  labelActive: { color: Colors.primary, fontWeight: '700' },
  badge: {
    position: 'absolute',
    top: -3,
    right: 2,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    minWidth: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  badgeTxt: { color: Colors.white, fontSize: 8, fontWeight: '800' },
});
