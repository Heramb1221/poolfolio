import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts } from '../../theme/tokens';
import { initials } from '../../theme/format';

const tones: ReadonlyArray<readonly [string, string]> = [
  ['#10B981', '#047857'],
  ['#0EA5E9', '#2563EB'],
  ['#8B5CF6', '#6D28D9'],
  ['#F59E0B', '#D97706'],
  ['#EC4899', '#BE185D'],
  ['#14B8A6', '#0F766E'],
];

export function Avatar({ name, size = 40, index }: { name?: string | null; size?: number; index?: number }) {
  const i = index ?? ((name?.charCodeAt(0) ?? 0) % tones.length);
  const t = tones[i % tones.length];
  return (
    <LinearGradient
      colors={[t[0], t[1]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.av, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[styles.txt, { fontSize: size * 0.38 }]}>{initials(name)}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  av: { alignItems: 'center', justifyContent: 'center' },
  txt: { fontFamily: fonts.sansBold, color: colors.white },
});
