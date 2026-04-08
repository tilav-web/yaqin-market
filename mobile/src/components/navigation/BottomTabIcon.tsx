import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius } from '../../theme';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

type TabBarButtonProps = {
  // passed by React Navigation tabBarButton
  onPress?: ((e?: any) => void) | null;
  onLongPress?: ((e?: any) => void) | null;
  accessibilityState?: { selected?: boolean };
  children?: any;
  [key: string]: any;
  // custom
  label: string;
  iconActive: IoniconsName;
  iconInactive: IoniconsName;
  accentColor: string;
  badge?: number;
};

export function TabBarButton({
  onPress,
  onLongPress,
  accessibilityState,
  label,
  iconActive,
  iconInactive,
  accentColor,
  badge,
}: TabBarButtonProps) {
  const focused = accessibilityState?.selected ?? false;

  return (
    <Pressable
      onPress={onPress ?? undefined}
      onLongPress={onLongPress ?? undefined}
      android_ripple={{ color: 'transparent' }}
      style={styles.btn}
    >
      <View style={[styles.pill, focused && { backgroundColor: accentColor, ...pillShadow }]}>
        <Ionicons
          name={focused ? iconActive : iconInactive}
          size={20}
          color={focused ? Colors.white : Colors.textHint}
        />
        {(badge ?? 0) > 0 && (
          <View style={[styles.badge, { backgroundColor: accentColor }]}>
            <Text style={styles.badgeTxt}>{(badge ?? 0) > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>

      {focused
        ? <Text style={[styles.label, { color: accentColor }]} numberOfLines={1}>{label}</Text>
        : <View style={styles.spacer} />
      }
    </Pressable>
  );
}

const pillShadow = {
  shadowColor: Colors.primary,
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.25,
  shadowRadius: 6,
  elevation: 4,
};

export const bottomTabBarStyle = {
  bar: {
    height: Platform.OS === 'ios' ? 82 : 64,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 22 : 6,
    backgroundColor: Colors.white,
    borderTopWidth: 0,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  } as const,
};

const styles = StyleSheet.create({
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  pill: {
    width: 44,
    height: 30,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
    textAlign: 'center',
    maxWidth: 70,
  },
  spacer: {
    height: 13,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: 0,
    borderRadius: Radius.full,
    minWidth: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  badgeTxt: {
    color: Colors.white,
    fontSize: 8,
    fontWeight: '800',
  },
});
