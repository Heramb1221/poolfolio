import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from './PressableScale';
import { colors, fonts, gradients, radius, shadow } from '../../theme/tokens';

type Variant = 'primary' | 'secondary' | 'danger' | 'soft' | 'ghost';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: 'md' | 'sm';
  isLoading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon,
  style,
  fullWidth = true,
}: Props) {
  const off = disabled || isLoading;
  const gradient = variant === 'primary' ? gradients.primary : variant === 'danger' ? gradients.danger : null;
  const fg =
    gradient ? colors.white : variant === 'soft' ? colors.primaryDark : variant === 'ghost' ? colors.primaryDark : colors.ink;
  const pad = size === 'sm' ? { paddingVertical: 9, paddingHorizontal: 14 } : { paddingVertical: 15, paddingHorizontal: 18 };

  const inner = (
    <View style={[styles.row, pad]}>
      {isLoading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 15 : 18} color={fg} style={{ marginRight: 8 }} /> : null}
          <Text style={[styles.text, { color: fg, fontSize: size === 'sm' ? 13 : 15.5 }]}>{title}</Text>
        </>
      )}
    </View>
  );

  return (
    <PressableScale
      onPress={onPress}
      disabled={off}
      style={[
        styles.base,
        !fullWidth && { alignSelf: 'flex-start' },
        gradient && (variant === 'primary' ? shadow.glow : null),
        variant === 'secondary' && styles.secondary,
        variant === 'soft' && { backgroundColor: colors.primaryTint },
        off && { opacity: 0.55 },
        style,
      ]}
    >
      {gradient ? (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill}>
          {inner}
        </LinearGradient>
      ) : (
        inner
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, overflow: 'visible' },
  fill: { borderRadius: radius.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.sansBold, letterSpacing: 0.2 },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong },
});
