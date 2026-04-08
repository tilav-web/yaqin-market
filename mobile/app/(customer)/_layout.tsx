import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '../../src/theme';
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
    <View style={styles.tabItem}>
      <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
        <Ionicons
          name={focused ? iconActive : iconInactive}
          size={22}
          color={focused ? Colors.white : Colors.textHint}
        />
        {badge != null && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
    </View>
  );
}

export default function CustomerLayout() {
  const directCount = useCartStore(s => s.directItems.length);
  const broadcastCount = useCartStore(s => s.broadcastItems.length);
  const cartCount = directCount + broadcastCount;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconActive="home"
              iconInactive="home-outline"
              label="Asosiy"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconActive="search"
              iconInactive="search-outline"
              label="Qidirish"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
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
            <TabIcon
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
            <TabIcon
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

const styles = StyleSheet.create({
  tabBar: {
    height: Platform.OS === 'ios' ? 80 : 68,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    backgroundColor: Colors.white,
    borderTopWidth: 0,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  tabItem: {
    alignItems: 'center',
    gap: 4,
  },
  iconWrap: {
    width: 44,
    height: 36,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconWrapActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  label: {
    fontSize: 10,
    color: Colors.textHint,
    fontWeight: '500',
  },
  labelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: 4,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  badgeText: { color: Colors.white, fontSize: 9, fontWeight: '800' },
});
