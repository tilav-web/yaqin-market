import { Tabs } from 'expo-router';
import React from 'react';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 64,
          paddingBottom: 12,
          paddingTop: 8,
          borderTopColor: '#e5e7eb',
          backgroundColor: '#ffffff',
        },
        tabBarActiveTintColor: '#111827',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Asosiy' }} />
      <Tabs.Screen name="search" options={{ title: 'Qidiruv' }} />
      <Tabs.Screen name="cart" options={{ title: 'Savatcha' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
