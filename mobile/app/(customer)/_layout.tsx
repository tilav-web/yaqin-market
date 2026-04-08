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
    <View style={t.wrap}>
      {focused ? (
        // Active: pill with icon + label side by side
        <View style={t.activePill}>
          <Ionicons name={iconActive} size={18} color={Colors.white} />
          <Text style={t.activeLabel}>{label}</Text>
          {badge != null && badge > 0 && (
            <View style={t.badge}>
              <Text style={t.badgeTxt}>{badge > 9 ? '9+' : badge}</Text>
            </View>
          )}
        </View>
      ) : (
        // Inactive: icon only
        <View style={t.iconWrap}>
          <Ionicons name={iconInactive} size={22} color={Colors.textHint} />
          {badge != null && badge > 0 && (
            <View style={t.badge}>
              <Text style={t.badgeTxt}>{badge > 9 ? '9+' : badge}</Text>
            </View>
          )}
        </View>
      )}
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
        tabBarStyle: t.bar,
        tabBarShowLabel: false,
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
            <TabIcon iconActive="search" iconInactive="search-outline" label="Izlash" focused={focused} />
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

const t = StyleSheet.create({
  bar: {
    height: Platform.OS === 'ios' ? 82 : 64,
    paddingBottom: Platform.OS === 'ios' ? 22 : 6,
    paddingTop: 8,
    backgroundColor: Colors.white,
    borderTopWidth: 0,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
  },
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Active: horizontal pill
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  activeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.1,
  },
  // Inactive: icon only
  iconWrap: {
    width: 40,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -1,
    right: -1,
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
