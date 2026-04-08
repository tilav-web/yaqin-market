import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '../../src/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const COURIER_COLOR = '#FF5722';

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

export default function CourierLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: t.bar,
      tabBarShowLabel: false,
      tabBarItemStyle: { flex: 1 },
    }}>
      <Tabs.Screen name="nearby" options={{ tabBarIcon: ({ focused }) =>
        <TabIcon iconActive="map" iconInactive="map-outline" label="Yaqin" focused={focused} /> }} />
      <Tabs.Screen name="active" options={{ tabBarIcon: ({ focused }) =>
        <TabIcon iconActive="bicycle" iconInactive="bicycle-outline" label="Faol" focused={focused} /> }} />
      <Tabs.Screen name="history" options={{ tabBarIcon: ({ focused }) =>
        <TabIcon iconActive="time" iconInactive="time-outline" label="Tarix" focused={focused} /> }} />
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
    backgroundColor: COURIER_COLOR,
    shadowColor: COURIER_COLOR,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  label: { fontSize: 9, color: Colors.textHint, fontWeight: '500' },
  labelActive: { color: COURIER_COLOR, fontWeight: '700' },
});
