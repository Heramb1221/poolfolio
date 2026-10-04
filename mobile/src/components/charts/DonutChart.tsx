import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { colors, fonts } from '../../theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const CHART_COLORS = ['#10B981', '#0EA5E9', '#8B5CF6', '#F59E0B', '#EC4899', '#14B8A6', '#64748B', '#F43F5E'];

export interface DonutSegment {
  label: string;
  value: number;
  color?: string;
}

function Segment({
  cx,
  r,
  stroke,
  color,
  circ,
  len,
  offset,
  index,
}: {
  cx: number;
  r: number;
  stroke: number;
  color: string;
  circ: number;
  len: number;
  offset: number;
  index: number;
}) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = 0;
    p.value = withDelay(index * 90, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [len, index, p]);
  const props = useAnimatedProps(() => ({ strokeDasharray: [Math.max(0, len * p.value - 2), circ] as unknown as string }));
  return (
    <AnimatedCircle
      cx={cx}
      cy={cx}
      r={r}
      stroke={color}
      strokeWidth={stroke}
      fill="none"
      strokeLinecap="round"
      strokeDashoffset={-offset}
      animatedProps={props}
    />
  );
}

export function DonutChart({
  segments,
  size = 170,
  thickness = 20,
  centerTop,
  centerBottom,
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerTop?: string;
  centerBottom?: string;
}) {
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((a, s) => a + Math.max(0, s.value), 0) || 1;
  let acc = 0;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.primaryTint} strokeWidth={thickness} fill="none" />
          {segments.map((s, i) => {
            const frac = Math.max(0, s.value) / total;
            const len = frac * circ;
            const offset = acc * circ;
            acc += frac;
            return (
              <Segment
                key={`${s.label}-${i}`}
                cx={size / 2}
                r={r}
                stroke={thickness}
                color={s.color ?? CHART_COLORS[i % CHART_COLORS.length]}
                circ={circ}
                len={len}
                offset={offset}
                index={i}
              />
            );
          })}
        </G>
      </Svg>
      <View style={styles.center} pointerEvents="none">
        {centerTop ? <Text style={styles.top}>{centerTop}</Text> : null}
        {centerBottom ? <Text style={styles.bottom}>{centerBottom}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', alignItems: 'center' },
  top: { fontFamily: fonts.monoBold, fontSize: 20, color: colors.ink },
  bottom: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.muted, marginTop: 2, letterSpacing: 0.4 },
});
