import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { PressableScale } from './PressableScale';
import { colors, fonts, radius } from '../../theme/tokens';

interface Tab<T extends string> {
  id: T;
  label: string;
}

function Item({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const p = useSharedValue(active ? 1 : 0);
  React.useEffect(() => {
    p.value = withTiming(active ? 1 : 0, { duration: 220 });
  }, [active, p]);
  const bg = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], ['rgba(255,255,255,0.7)', colors.primaryDeep]),
    borderColor: interpolateColor(p.value, [0, 1], [colors.border, colors.primaryDeep]),
  }));
  const txt = useAnimatedStyle(() => ({
    color: interpolateColor(p.value, [0, 1], [colors.ink2, colors.white]),
  }));
  return (
    <PressableScale onPress={onPress} scaleTo={0.95}>
      <Animated.View style={[styles.item, bg]}>
        <Animated.Text style={[styles.text, txt]}>{label}</Animated.Text>
      </Animated.View>
    </PressableScale>
  );
}

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: ReadonlyArray<Tab<T>>;
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.scroll}>
      {tabs.map((t) => (
        <Item key={t.id} label={t.label} active={t.id === value} onPress={() => onChange(t.id)} />
      ))}
    </ScrollView>
  );
}

/** Two-or-three option toggle that fills the width (e.g. STOCK / IPO). */
export function OptionPills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<Tab<T>>;
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      scrollEnabled={false}
      contentContainerStyle={[styles.row, { flexGrow: 1 }]}
      showsHorizontalScrollIndicator={false}
    >
      {options.map((o) => (
        <PressableScale key={o.id} style={{ flex: 1 }} onPress={() => onChange(o.id)}>
          <OptionBody label={o.label} active={o.id === value} />
        </PressableScale>
      ))}
    </ScrollView>
  );
}

function OptionBody({ label, active }: { label: string; active: boolean }) {
  const p = useSharedValue(active ? 1 : 0);
  React.useEffect(() => {
    p.value = withTiming(active ? 1 : 0, { duration: 200 });
  }, [active, p]);
  const bg = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], ['rgba(255,255,255,0.8)', colors.primaryTint]),
    borderColor: interpolateColor(p.value, [0, 1], [colors.borderStrong, colors.primary]),
  }));
  const txt = useAnimatedStyle(() => ({
    color: interpolateColor(p.value, [0, 1], [colors.ink2, colors.primaryDark]),
  }));
  return (
    <Animated.View style={[styles.option, bg]}>
      <Animated.Text style={[styles.optionText, txt]}>{label}</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, marginBottom: 14, marginHorizontal: -20 },
  row: { gap: 8, paddingHorizontal: 20 },
  item: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.pill, borderWidth: 1 },
  text: { fontFamily: fonts.sansSemi, fontSize: 13 },
  option: { paddingVertical: 13, borderRadius: radius.md, borderWidth: 1.3, alignItems: 'center' },
  optionText: { fontFamily: fonts.sansBold, fontSize: 14, letterSpacing: 0.4 },
});
