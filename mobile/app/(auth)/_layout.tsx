import { Stack } from 'expo-router';
import { Colors } from '../../src/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 220,
        contentStyle: { backgroundColor: Colors.background },
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="otp" />
    </Stack>
  );
}
