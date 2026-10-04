import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../theme/tokens';

export function Spinner({ size = 'small', color = colors.primary }: { size?: 'small' | 'large'; color?: string }) {
  return <ActivityIndicator size={size} color={color} />;
}

export function LoadingBlock({ label, fill = false }: { label?: string; fill?: boolean }) {
  return (
    <View style={[styles.block, fill && { flex: 1 }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { alignItems: 'center', justifyContent: 'center', paddingVertical: 36, gap: 12 },
  label: { fontFamily: fonts.sansMedium, color: colors.ink2, fontSize: 13 },
});
