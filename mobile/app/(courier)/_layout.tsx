import { Tabs } from 'expo-router';
import { CustomTabBar } from '../../src/components/navigation/CustomTabBar';

const COURIER_COLOR = '#FF5722';

export default function CourierLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <CustomTabBar
          {...props}
          accentColor={COURIER_COLOR}
          tabs={[
            { name: 'nearby',  label: 'Yaqin',  icon: 'map-outline',     iconFocused: 'map' },
            { name: 'active',  label: 'Faol',   icon: 'bicycle-outline', iconFocused: 'bicycle' },
            { name: 'history', label: 'Tarix',  icon: 'time-outline',    iconFocused: 'time' },
            { name: 'profile', label: 'Profil', icon: 'person-outline',  iconFocused: 'person' },
          ]}
        />
      )}
    >
      <Tabs.Screen name="nearby" />
      <Tabs.Screen name="active" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
