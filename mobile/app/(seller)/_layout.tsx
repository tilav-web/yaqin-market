import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '../../src/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ iconActive, iconInactive, label, focused }: {
  iconActive: IoniconsName; iconInactive: IoniconsName; label: string; focused: boolean;
}) {
  return (
    <View style={t.wrap}>
      {focused ? (
        <View style={t.activePill}>
          <Ionicons name={iconActive} size={18} color={Colors.white} />
          <Text style={t.activeLabel}>{label}</Text>
        </View>
      ) : (
        <View style={t.iconWrap}>
          <Ionicons name={iconInactive} size={22} color={Colors.textHint} />
        </View>
      )}
    </View>
  );
}

export default function SellerLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: t.bar,
      tabBarShowLabel: false,
    }}>
      <Tabs.Screen name="dashboard" options={{ tabBarIcon: ({ focused }) =>
        <TabIcon iconActive="grid" iconInactive="grid-outline" label="Bosh" focused={focused} /> }} />
      <Tabs.Screen name="orders" options={{ tabBarIcon: ({ focused }) =>
        <TabIcon iconActive="cube" iconInactive="cube-outline" label="Buyurtma" focused={focused} /> }} />
      <Tabs.Screen name="broadcast-feed" options={{ tabBarIcon: ({ focused }) =>
        <TabIcon iconActive="megaphone" iconInactive="megaphone-outline" label="Umumiy" focused={focused} /> }} />
      <Tabs.Screen name="products" options={{ tabBarIcon: ({ focused }) =>
        <TabIcon iconActive="bag" iconInactive="bag-outline" label="Mahsulot" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ focused }) =>
        <TabIcon iconActive="person" iconInactive="person-outline" label="Profil" focused={focused} /> }} />
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
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  activeLabel: { fontSize: 12, fontWeight: '700', color: Colors.white },
  iconWrap: { width: 40, height: 36, alignItems: 'center', justifyContent: 'center' },
});
