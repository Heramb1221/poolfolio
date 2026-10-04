import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from './PressableScale';
import { colors, fonts, radius } from '../../theme/tokens';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function Input({ label, error, icon, secureTextEntry, onFocus, onBlur, style, multiline, ...props }: Props) {
  const focus = useSharedValue(0);
  const [hidden, setHidden] = useState(!!secureTextEntry);

  const box = useAnimatedStyle(() => ({
    borderColor: error
      ? colors.loss
      : interpolateColor(focus.value, [0, 1], [colors.borderStrong, colors.primary]),
    backgroundColor: interpolateColor(focus.value, [0, 1], ['rgba(255,255,255,0.8)', '#FFFFFF']),
  }));

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Animated.View style={[styles.box, box, multiline && { alignItems: 'flex-start' }]}>
        {icon ? (
          <Ionicons name={icon} size={18} color={colors.muted} style={[styles.icon, multiline && { marginTop: 14 }]} />
        ) : null}
        <TextInput
          {...props}
          multiline={multiline}
          secureTextEntry={hidden}
          placeholderTextColor={colors.faint}
          selectionColor={colors.primary}
          onFocus={(e) => {
            focus.value = withTiming(1, { duration: 160 });
            onFocus?.(e);
          }}
          onBlur={(e) => {
            focus.value = withTiming(0, { duration: 160 });
            onBlur?.(e);
          }}
          style={[styles.input, style]}
        />
        {secureTextEntry ? (
          <PressableScale onPress={() => setHidden((h) => !h)} hitSlop={10} scaleTo={0.9}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={19} color={colors.muted} />
          </PressableScale>
        ) : null}
      </Animated.View>
      {error ? (
        <View style={styles.errRow}>
          <Ionicons name="alert-circle" size={13} color={colors.loss} />
          <Text style={styles.err}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontFamily: fonts.sansSemi, fontSize: 12.5, color: colors.ink2, marginBottom: 7, letterSpacing: 0.3 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.3,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  icon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontFamily: fonts.sansMedium, fontSize: 15.5, color: colors.ink },
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  err: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.loss },
});
