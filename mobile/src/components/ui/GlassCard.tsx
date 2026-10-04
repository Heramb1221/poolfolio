import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, radius, shadow } from '../../theme/tokens';

interface Props {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /** Real backdrop blur (iOS only; Android falls back to a translucent fill). */
  blur?: boolean;
  padded?: boolean;
  flat?: boolean;
}

export function GlassCard({ children, style, contentStyle, blur = false, padded = true, flat = false }: Props) {
  return (
    <View style={[styles.shadowWrap, !flat && shadow.card, style]}>
      <View style={styles.clip}>
        {blur && Platform.OS === 'ios' ? (
          <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
        ) : null}
        <View
          style={[
            padded && styles.padded,
            { backgroundColor: blur && Platform.OS === 'ios' ? colors.glass : colors.glassStrong },
            contentStyle,
          ]}
        >
          {children}
        </View>
      </View>
    </View>
  );
}

/** Backwards-compatible name used across the app. */
export const Card = GlassCard;

const styles = StyleSheet.create({
  shadowWrap: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginBottom: 14,
  },
  clip: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  padded: { padding: 16 },
});
