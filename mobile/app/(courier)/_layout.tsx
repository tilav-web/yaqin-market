import { Tabs } from 'expo-router';
import { BottomTabIcon, bottomTabBarStyle } from '../../src/components/navigation/BottomTabIcon';

const COURIER_COLOR = '#FF5722';

export default function CourierLayout() {
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
        name="nearby"
        options={{
          tabBarIcon: ({ focused }) => (
            <BottomTabIcon
              accentColor={COURIER_COLOR}
              iconActive="map"
              iconInactive="map-outline"
              label="Yaqin"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="active"
        options={{
          tabBarIcon: ({ focused }) => (
            <BottomTabIcon
              accentColor={COURIER_COLOR}
              iconActive="bicycle"
              iconInactive="bicycle-outline"
              label="Faol"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarIcon: ({ focused }) => (
            <BottomTabIcon
              accentColor={COURIER_COLOR}
              iconActive="time"
              iconInactive="time-outline"
              label="Tarix"
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
              accentColor={COURIER_COLOR}
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
