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
      <View style={[t.pill, focused && t.pillActive]}>
        <Ionicons name={focused ? iconActive : iconInactive} size={21}
          color={focused ? Colors.white : Colors.textHint} />
      </View>
      <Text style={[t.label, focused && t.labelActive]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export default function SellerLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: t.bar,
      tabBarShowLabel: false,
      tabBarItemStyle: { flex: 1 },
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
  pill: { width: 46, height: 30, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  pillActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  label: { fontSize: 9, color: Colors.textHint, fontWeight: '500' },
  labelActive: { color: Colors.primary, fontWeight: '700' },
});
