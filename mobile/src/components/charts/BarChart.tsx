import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts } from '../../theme/tokens';

export interface Bar {
  label: string;
  value: number;
  display?: string;
  color?: string;
}

function BarItem({ bar, max, height, index }: { bar: Bar; max: number; height: number; index: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = 0;
    p.value = withDelay(index * 70, withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }));
  }, [bar.value, index, p]);
  const style = useAnimatedStyle(() => ({ height: Math.max(6, (bar.value / max) * height) * p.value }));
  const c = bar.color ?? colors.primary;
  return (
    <View style={styles.col}>
      <Text style={styles.val} numberOfLines={1}>
        {bar.display ?? ''}
      </Text>
      <View style={{ height, justifyContent: 'flex-end' }}>
        <Animated.View style={[styles.bar, style]}>
          <LinearGradient colors={[c, `${c}99`]} style={StyleSheet.absoluteFill} />
        </Animated.View>
      </View>
      <Text style={styles.lbl} numberOfLines={1}>
        {bar.label}
      </Text>
    </View>
  );
}

export function BarChart({ bars, height = 130 }: { bars: Bar[]; height?: number }) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <View style={styles.row}>
      {bars.map((b, i) => (
        <BarItem key={`${b.label}-${i}`} bar={b} max={max} height={height} index={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  col: { flex: 1, alignItems: 'center' },
  bar: { width: '70%', minWidth: 18, borderRadius: 10, overflow: 'hidden', alignSelf: 'center' },
  val: { fontFamily: fonts.monoBold, fontSize: 9.5, color: colors.ink2, marginBottom: 6 },
  lbl: { fontFamily: fonts.sansSemi, fontSize: 10.5, color: colors.muted, marginTop: 7, maxWidth: '100%' },
});
