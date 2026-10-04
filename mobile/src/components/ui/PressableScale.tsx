import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  children?: React.ReactNode;
}

/** Subtle press feedback: quick scale + dim. Used for every tappable surface. */
export function PressableScale({ style, scaleTo = 0.975, children, onPressIn, onPressOut, ...rest }: Props) {
  const p = useSharedValue(0);
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - p.value * (1 - scaleTo) }],
    opacity: 1 - p.value * 0.08,
  }));
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        p.value = withTiming(1, { duration: 90 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        p.value = withTiming(0, { duration: 160 });
        onPressOut?.(e);
      }}
      style={[style, anim]}
    >
      {children}
    </AnimatedPressable>
  );
}
