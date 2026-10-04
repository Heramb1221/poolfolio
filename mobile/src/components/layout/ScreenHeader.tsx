import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '../ui/PressableScale';
import { colors, fonts, shadow } from '../../theme/tokens';

export function ScreenHeader({
  title,
  subtitle,
  right,
  onBack,
  showBack = true,
  modal = false,
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  onBack?: () => void;
  showBack?: boolean;
  modal?: boolean;
}) {
  const router = useRouter();
  const back = () => (onBack ? onBack() : router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)'));
  return (
    <View style={styles.row}>
      {showBack ? (
        <PressableScale onPress={back} style={[styles.btn, shadow.card]} scaleTo={0.9} hitSlop={8}>
          <Ionicons name={modal ? 'close' : 'chevron-back'} size={20} color={colors.ink} />
        </PressableScale>
      ) : (
        <View style={{ width: 4 }} />
      )}
      <View style={styles.mid}>
        {title ? (
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text style={styles.sub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10, gap: 12 },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mid: { flex: 1 },
  title: { fontFamily: fonts.sansBold, fontSize: 19, color: colors.ink, letterSpacing: -0.2 },
  sub: { fontFamily: fonts.mono, fontSize: 11.5, color: colors.primaryDark, marginTop: 1 },
  right: { minWidth: 4, alignItems: 'flex-end' },
});
