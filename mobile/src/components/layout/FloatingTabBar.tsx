import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from '../ui/PressableScale';
import { colors, fonts, gradients, shadow } from '../../theme/tokens';

const ICONS: Record<string, { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap; label: string }> = {
  index: { on: 'pie-chart', off: 'pie-chart-outline', label: 'Portfolio' },
  groups: { on: 'people', off: 'people-outline', label: 'Groups' },
  profile: { on: 'person-circle', off: 'person-circle-outline', label: 'Profile' },
};

const PAD = 6;

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const itemW = width > 0 ? (width - PAD * 2) / state.routes.length : 0;

  useEffect(() => {
    x.value = withSpring(state.index * itemW, { damping: 28, stiffness: 260, mass: 0.8 });
  }, [state.index, itemW, x]);

  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View pointerEvents="box-none" style={[styles.outer, { bottom: Math.max(insets.bottom, 12) + 4 }]}>
      <View style={[styles.pill, shadow.float]} onLayout={onLayout}>
        <View style={styles.clip}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
          ) : null}
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.66)' : 'rgba(255,255,255,0.96)' },
            ]}
          />
          {itemW > 0 ? (
            <Animated.View style={[styles.indicator, { width: itemW, left: PAD }, indicator]}>
              <LinearGradient
                colors={gradients.hero}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          ) : null}

          <View style={styles.row}>
            {state.routes.map((route, i) => {
              const focused = state.index === i;
              const m = ICONS[route.name] ?? { on: 'ellipse', off: 'ellipse-outline', label: route.name };
              const onPress = () => {
                const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !e.defaultPrevented) navigation.navigate(route.name as never);
              };
              return (
                <PressableScale
                  key={route.key}
                  onPress={onPress}
                  onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
                  scaleTo={0.92}
                  style={styles.item}
                  accessibilityRole="button"
                  accessibilityState={focused ? { selected: true } : {}}
                  accessibilityLabel={m.label}
                >
                  <Ionicons name={focused ? m.on : m.off} size={22} color={focused ? colors.white : colors.ink2} />
                  <Text style={[styles.label, { color: focused ? colors.white : colors.ink2 }]}>{m.label}</Text>
                </PressableScale>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { position: 'absolute', left: 20, right: 20 },
  pill: { borderRadius: 34, backgroundColor: colors.surface },
  clip: {
    borderRadius: 34,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    paddingVertical: PAD,
  },
  row: { flexDirection: 'row', paddingHorizontal: PAD },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, gap: 2 },
  label: { fontFamily: fonts.sansSemi, fontSize: 11, letterSpacing: 0.2 },
  indicator: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    borderRadius: 28,
    overflow: 'hidden',
  },
});
