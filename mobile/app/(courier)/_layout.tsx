import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '../../src/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const ACTIVE_COLOR = '#FF5722';

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

export default function CourierLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: t.bar,
      tabBarShowLabel: false,
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
    backgroundColor: ACTIVE_COLOR,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    shadowColor: ACTIVE_COLOR,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  activeLabel: { fontSize: 12, fontWeight: '700', color: Colors.white },
  iconWrap: { width: 40, height: 36, alignItems: 'center', justifyContent: 'center' },
});
