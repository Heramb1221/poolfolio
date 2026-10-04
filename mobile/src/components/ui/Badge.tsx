import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { InvestmentStatus, GroupRole } from '../../types/api';
import { colors, fonts, radius } from '../../theme/tokens';

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const palette: Record<Variant, { bg: string; fg: string }> = {
  default: { bg: 'rgba(11,31,23,0.06)', fg: colors.ink2 },
  success: { bg: colors.gainSoft, fg: colors.gain },
  warning: { bg: colors.warnSoft, fg: colors.warn },
  danger: { bg: colors.lossSoft, fg: colors.loss },
  info: { bg: colors.infoSoft, fg: colors.info },
};

export function Badge({ label, variant = 'default', dot = false }: { label: string; variant?: Variant; dot?: boolean }) {
  const c = palette[variant];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      {dot ? <View style={[styles.dot, { backgroundColor: c.fg }]} /> : null}
      <Text style={[styles.text, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: InvestmentStatus }) {
  const map: Record<InvestmentStatus, Variant> = {
    DRAFT: 'default',
    OPEN: 'info',
    LOCKED: 'warning',
    ACTIVE: 'success',
    SETTLED: 'default',
    CANCELLED: 'danger',
  };
  return <Badge label={status} variant={map[status] ?? 'default'} dot />;
}

export function RoleBadge({ role }: { role: GroupRole }) {
  if (role === 'LEADER') return <Badge label="LEADER" variant="warning" />;
  if (role === 'CO_LEADER') return <Badge label="CO-LEADER" variant="info" />;
  return <Badge label="MEMBER" />;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: radius.pill,
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontFamily: fonts.sansBold, fontSize: 10.5, letterSpacing: 0.9 },
});
