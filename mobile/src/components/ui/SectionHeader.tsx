import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from './PressableScale';
import { colors, fonts } from '../../theme/tokens';

export function SectionHeader({
  title,
  action,
  onAction,
  right,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  right?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action ? (
        <PressableScale onPress={onAction} hitSlop={8} scaleTo={0.94} style={styles.action}>
          <Text style={styles.actionText}>{action}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primaryDark} />
        </PressableScale>
      ) : right ? (
        <Text style={styles.right}>{right}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 12 },
  title: { fontFamily: fonts.sansBold, fontSize: 18, color: colors.ink, letterSpacing: -0.2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  actionText: { fontFamily: fonts.sansSemi, fontSize: 13, color: colors.primaryDark },
  right: { fontFamily: fonts.mono, fontSize: 12, color: colors.muted },
});
