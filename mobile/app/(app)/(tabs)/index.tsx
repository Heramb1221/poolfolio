import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useAuth } from '../../../src/hooks/useAuth';
import { usePortfolio } from '../../../src/hooks/usePortfolio';
import { Screen } from '../../../src/components/layout/Screen';
import { GlassCard } from '../../../src/components/ui/GlassCard';
import { Avatar } from '../../../src/components/ui/Avatar';
import { PressableScale } from '../../../src/components/ui/PressableScale';
import { SectionHeader } from '../../../src/components/ui/SectionHeader';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { LoadingBlock } from '../../../src/components/ui/Spinner';
import { CountUpText } from '../../../src/components/ui/CountUpText';
import { AreaChart } from '../../../src/components/charts/AreaChart';
import { InvestmentRow, GroupRow } from '../../../src/components/portfolio/Rows';
import { colors, fonts, gradients, radius, shadow } from '../../../src/theme/tokens';
import { greeting, inr, inrCompact } from '../../../src/theme/format';
import { enter } from '../../../src/theme/motion';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const p = usePortfolio();
  const up = p.totals.netPnl >= 0;
  const firstName = user?.name?.split(' ')[0] || 'Investor';

  return (
    <Screen tabBar refreshing={p.isRefetching} onRefresh={p.refetch}>
      {/* Greeting */}
      <Animated.View entering={enter(0)} style={styles.top}>
        <Avatar name={user?.name} size={46} />
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>{greeting()}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {firstName}
          </Text>
        </View>
        <PressableScale onPress={() => router.push('/(app)/groups/create')} style={[styles.plus, shadow.card]} scaleTo={0.9}>
          <Ionicons name="add" size={22} color={colors.primaryDark} />
        </PressableScale>
      </Animated.View>

      {/* Hero */}
      <Animated.View entering={enter(1)} style={[styles.heroShadow, shadow.glow]}>
        <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroOrb} />
          <View style={styles.heroHead}>
            <Text style={styles.heroLabel}>PORTFOLIO VALUE</Text>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Server-verified</Text>
            </View>
          </View>

          <CountUpText value={p.totals.value} format={(n) => inr(n)} style={styles.heroValue} />

          <View style={styles.chipRow}>
            <View style={[styles.chip, { backgroundColor: up ? 'rgba(167,243,208,0.2)' : 'rgba(254,202,202,0.22)' }]}>
              <Ionicons name={up ? 'trending-up' : 'trending-down'} size={14} color={up ? '#A7F3D0' : '#FECACA'} />
              <Text style={[styles.chipText, { color: up ? '#A7F3D0' : '#FECACA' }]}>{inr(p.totals.netPnl, { sign: true })}</Text>
              <Text style={styles.chipSub}>net P&L</Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipSub}>Invested</Text>
              <Text style={[styles.chipText, { color: colors.white }]}>{inrCompact(p.totals.invested)}</Text>
            </View>
          </View>

          {p.hasPnl && p.series.values.length > 1 ? (
            <View style={{ marginTop: 14 }}>
              <AreaChart
                data={p.series.values}
                labels={p.series.labels}
                height={118}
                onDark
                formatValue={(n) => inr(n, { sign: true })}
              />
              <Text style={styles.chartCap}>Net P&L by investment · drag to inspect</Text>
            </View>
          ) : (
            <Text style={styles.heroHint}>
              {p.isLoading
                ? 'Syncing your investments…'
                : 'Lock capital and activate an investment to see live value and performance here.'}
            </Text>
          )}
        </LinearGradient>
      </Animated.View>

      {/* Quick stats */}
      <View style={styles.stats}>
        {[
          { icon: 'people' as const, label: 'Groups', value: p.counts.groups },
          { icon: 'layers' as const, label: 'Investments', value: p.counts.investments },
          { icon: 'flash' as const, label: 'Active', value: p.counts.active },
        ].map((s, i) => (
          <Animated.View key={s.label} entering={enter(2 + i)} style={{ flex: 1 }}>
            <GlassCard contentStyle={styles.stat} style={{ marginBottom: 0 }}>
              <View style={styles.statIcon}>
                <Ionicons name={s.icon} size={16} color={colors.primaryDark} />
              </View>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </GlassCard>
          </Animated.View>
        ))}
      </View>

      {p.isLoading && p.groups.length === 0 ? <LoadingBlock /> : null}

      {!p.isLoading && p.groups.length === 0 ? (
        <GlassCard style={{ marginTop: 22 }}>
          <EmptyState
            icon="people-outline"
            title="Start your first pool"
            message="Create a group, invite friends and track every contribution, allotment and payout transparently."
            actionLabel="Create your first group"
            onAction={() => router.push('/(app)/groups/create')}
          />
        </GlassCard>
      ) : null}

      {p.positions.length > 0 ? (
        <>
          <View style={{ height: 14 }} />
          <SectionHeader title="Positions" right={`${p.positions.length} total`} />
          {p.positions.slice(0, 5).map((pos, i) => (
            <InvestmentRow
              key={pos.investment.id}
              index={i}
              investment={pos.investment}
              groupName={pos.groupName}
              pnl={pos.pnl}
              onPress={() => router.push(`/(app)/investments/${pos.investment.id}` as any)}
            />
          ))}
        </>
      ) : null}

      {p.groups.length > 0 ? (
        <>
          <View style={{ height: 6 }} />
          <SectionHeader title="Your groups" action="See all" onAction={() => router.push('/(app)/(tabs)/groups')} />
          {p.groups.slice(0, 3).map((g, i) => (
            <GroupRow key={g.id} group={g} index={i} onPress={() => router.push(`/(app)/groups/${g.id}` as any)} />
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  hello: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.muted },
  name: { fontFamily: fonts.sansBold, fontSize: 24, color: colors.ink, letterSpacing: -0.5 },
  plus: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroShadow: { borderRadius: 28, marginBottom: 16 },
  hero: { borderRadius: 28, padding: 20, overflow: 'hidden' },
  heroOrb: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    right: -70,
    top: -90,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  heroHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { fontFamily: fonts.sansBold, fontSize: 11.5, color: colors.onHeroMuted, letterSpacing: 1.6 },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6EE7B7' },
  liveText: { fontFamily: fonts.sansSemi, fontSize: 10.5, color: colors.white },
  heroValue: { fontFamily: fonts.monoBold, fontSize: 34, color: colors.white, marginTop: 10, letterSpacing: -1 },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  chipText: { fontFamily: fonts.monoBold, fontSize: 12.5 },
  chipSub: { fontFamily: fonts.sansMedium, fontSize: 11.5, color: colors.onHeroMuted },
  chartCap: { fontFamily: fonts.sansMedium, fontSize: 10.5, color: colors.onHeroMuted, textAlign: 'center', marginTop: 6 },
  heroHint: { fontFamily: fonts.sans, fontSize: 13, color: colors.onHeroMuted, marginTop: 16, lineHeight: 19 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { padding: 12, alignItems: 'flex-start' },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: { fontFamily: fonts.monoBold, fontSize: 22, color: colors.ink },
  statLabel: { fontFamily: fonts.sansMedium, fontSize: 11.5, color: colors.muted, marginTop: 1 },
});
