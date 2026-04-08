import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius } from '../../theme';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

type BottomTabIconProps = {
  accentColor: string;
  badge?: number;
  focused: boolean;
  iconActive: IoniconsName;
  iconInactive: IoniconsName;
  label: string;
};

export function BottomTabIcon({
  accentColor,
  badge,
  focused,
  iconActive,
  iconInactive,
  label,
}: BottomTabIconProps) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.pill, focused && styles.pillActive, focused && { backgroundColor: accentColor, shadowColor: accentColor }]}>
        <Ionicons
          name={focused ? iconActive : iconInactive}
          size={21}
          color={focused ? Colors.white : Colors.textHint}
        />
        {badge != null && badge > 0 && (
          <View style={[styles.badge, { backgroundColor: accentColor }]}>
            <Text style={styles.badgeTxt}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>

      {focused ? (
        <Text style={[styles.label, { color: accentColor }]} numberOfLines={1}>
          {label}
        </Text>
      ) : (
        <View style={styles.labelSpacer} />
      )}
    </View>
  );
}

export const bottomTabBarStyle = StyleSheet.create({
  bar: {
    height: Platform.OS === 'ios' ? 82 : 68,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 22 : 6,
    paddingHorizontal: 6,
    backgroundColor: Colors.white,
    borderTopWidth: 0,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
  },
  item: {
    flex: 1,
    minWidth: 0,
  },
});

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    width: '100%',
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 2,
  },
  pill: {
    width: 42,
    height: 30,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  label: {
    width: '100%',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  labelSpacer: {
    height: 12,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: 1,
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
