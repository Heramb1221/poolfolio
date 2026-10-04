import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from './Button';
import { colors, fonts } from '../../theme/tokens';

export function EmptyState({
  icon = 'sparkles-outline',
  title,
  message,
  actionLabel,
  onAction,
  actionIcon = 'add',
  compact,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  compact?: boolean;
}) {
  return (
    <View style={[styles.wrap, compact && { paddingVertical: 14 }]}>
      <LinearGradient colors={['#D9F5E8', '#B7EBD2']} style={styles.badge}>
        <Ionicons name={icon} size={26} color={colors.primaryDark} />
      </LinearGradient>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.msg}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: 16, alignSelf: 'stretch' }}>
          <Button title={actionLabel} onPress={onAction} icon={actionIcon} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 8 },
  badge: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontFamily: fonts.sansBold, fontSize: 16.5, color: colors.ink, textAlign: 'center' },
  msg: { fontFamily: fonts.sans, fontSize: 13.5, color: colors.ink2, textAlign: 'center', marginTop: 6, lineHeight: 20 },
});
