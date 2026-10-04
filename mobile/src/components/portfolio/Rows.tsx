import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import { PressableScale } from '../ui/PressableScale';
import { StatusBadge } from '../ui/Badge';
import { Investment, PnLResponse, Group } from '../../types/api';
import { colors, fonts, radius, shadow } from '../../theme/tokens';
import { inr, isNegative, pct, shortDate } from '../../theme/format';
import { enter } from '../../theme/motion';

export function SymbolTile({ symbol, type, size = 46 }: { symbol: string; type: 'STOCK' | 'IPO'; size?: number }) {
  const grad = type === 'IPO' ? (['#EDE9FE', '#DDD6FE'] as const) : (['#D9F5E8', '#B7EBD2'] as const);
  const fg = type === 'IPO' ? '#6D28D9' : colors.primaryDark;
  return (
    <LinearGradient colors={grad} style={[styles.tile, { width: size, height: size, borderRadius: size * 0.32 }]}>
      <Text style={[styles.tileText, { color: fg, fontSize: size * 0.28 }]} numberOfLines={1}>
        {symbol.slice(0, 4)}
      </Text>
    </LinearGradient>
  );
}

export function InvestmentRow({
  investment,
  groupName,
  pnl,
  onPress,
  index = 0,
}: {
  investment: Investment;
  groupName?: string;
  pnl?: PnLResponse;
  onPress: () => void;
  index?: number;
}) {
  const neg = pnl ? isNegative(pnl.netPnl) : false;
  return (
    <Animated.View entering={enter(index)}>
      <PressableScale onPress={onPress} style={[styles.row, shadow.card]}>
        <SymbolTile symbol={investment.symbol} type={investment.type} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {investment.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {investment.symbol} · {investment.type}
            {groupName ? ` · ${groupName}` : ''}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 5 }}>
          {pnl ? (
            <>
              <Text style={[styles.pnl, { color: neg ? colors.loss : colors.gain }]}>{inr(pnl.netPnl, { sign: true })}</Text>
              <View style={[styles.pill, { backgroundColor: neg ? colors.lossSoft : colors.gainSoft }]}>
                <Ionicons name={neg ? 'caret-down' : 'caret-up'} size={9} color={neg ? colors.loss : colors.gain} />
                <Text style={[styles.pillText, { color: neg ? colors.loss : colors.gain }]}>{pct(pnl.returnPercentage)}</Text>
              </View>
            </>
          ) : (
            <StatusBadge status={investment.status} />
          )}
        </View>
      </PressableScale>
    </Animated.View>
  );
}

export function GroupRow({ group, onPress, index = 0 }: { group: Group; onPress: () => void; index?: number }) {
  return (
    <Animated.View entering={enter(index)}>
      <PressableScale onPress={onPress} style={[styles.row, shadow.card]}>
        <LinearGradient colors={['#065F46', '#10B981']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.groupIcon}>
          <Ionicons name="people" size={20} color={colors.white} />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {group.name}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="person-outline" size={12} color={colors.muted} />
            <Text style={styles.meta}>{group._count?.members ?? 0}</Text>
            <View style={styles.sep} />
            <Ionicons name="trending-up-outline" size={12} color={colors.muted} />
            <Text style={styles.meta}>{group._count?.investments ?? 0}</Text>
            <View style={styles.sep} />
            <Text style={styles.meta}>{shortDate(group.createdAt)}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.faint} />
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.glassStrong,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
    marginBottom: 10,
  },
  tile: { alignItems: 'center', justifyContent: 'center' },
  tileText: { fontFamily: fonts.monoBold, letterSpacing: 0.3 },
  name: { fontFamily: fonts.sansBold, fontSize: 15.5, color: colors.ink },
  meta: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.muted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  sep: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.faint, marginHorizontal: 3 },
  pnl: { fontFamily: fonts.monoBold, fontSize: 13.5 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.pill },
  pillText: { fontFamily: fonts.monoBold, fontSize: 10.5 },
  groupIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
