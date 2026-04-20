import React, { useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Animated } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../../theme';
import { haptics } from '../../utils/haptics';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export type TabItemConfig = {
  name: string;
  label: string;
  icon: IoniconsName;
  iconFocused: IoniconsName;
  badge?: number;
};

type Props = BottomTabBarProps & {
  tabs: TabItemConfig[];
  accentColor?: string;
};

export function CustomTabBar({ state, navigation, tabs, accentColor = Colors.primary }: Props) {
  return (
    <View style={styles.bar}>
      {state.routes.map((route, index) => {
        const tab = tabs.find(t => t.name === route.name);
        if (!tab) return null;

        const focused = state.index === index;

        const onPress = () => {
          haptics.light();
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, undefined);
          }
        };

        return (
          <TabItem
            key={route.key}
            tab={tab}
            focused={focused}
            accentColor={accentColor}
            onPress={onPress}
          />
        );
      })}
    </View>
  );
}

// ─── Animated Tab Item ────────────────────────────────────────────────────────
function TabItem({ tab, focused, accentColor, onPress }: {
  tab: TabItemConfig;
  focused: boolean;
  accentColor: string;
  onPress: () => void;
}) {
  const pressScale   = useRef(new Animated.Value(1)).current;
  const pillOpacity  = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const pillScale    = useRef(new Animated.Value(focused ? 1 : 0.6)).current;
  const labelOpacity = useRef(new Animated.Value(focused ? 1 : 0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(pillOpacity, {
        toValue: focused ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(pillScale, {
        toValue: focused ? 1 : 0.6,
        friction: 7,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(labelOpacity, {
        toValue: focused ? 1 : 0.5,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(pressScale, { toValue: 0.88, duration: 70, useNativeDriver: true }),
      Animated.spring(pressScale, { toValue: 1, friction: 5, tension: 150, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      android_ripple={{ color: 'transparent' }}
      style={styles.tab}
    >
      <Animated.View style={[styles.iconContainer, { transform: [{ scale: pressScale }] }]}>
        {/* Pill background (animates in/out) */}
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            styles.pill,
            {
              backgroundColor: accentColor,
              opacity: pillOpacity,
              transform: [{ scaleX: pillScale }],
            },
          ]}
        />

        {/* Icon */}
        <Ionicons
          name={focused ? tab.iconFocused : tab.icon}
          size={20}
          color={focused ? '#fff' : Colors.textHint}
        />

        {/* Badge */}
        {(tab.badge ?? 0) > 0 && (
          <View style={[styles.badge, { backgroundColor: accentColor }]}>
            <Text style={styles.badgeTxt}>
              {(tab.badge ?? 0) > 9 ? '9+' : tab.badge}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Label */}
      <Animated.Text
        style={[styles.label, { color: accentColor, opacity: labelOpacity }]}
        numberOfLines={1}
      >
        {tab.label}
      </Animated.Text>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 26 : 10,
    paddingHorizontal: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8E8E8',
    ...Shadow.lg,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconContainer: {
    width: 52,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    borderRadius: Radius.full,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 13,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
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
