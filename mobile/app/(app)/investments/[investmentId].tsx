import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  useInvestment,
  useUpdateInvestment,
  useContributions,
  useTransactions,
} from '../../../src/hooks/useInvestments';
import { useOwnership, usePnL, useSettlements, useSettleInvestment } from '../../../src/hooks/useAccounting';
import { useAnomalyAnalysis } from '../../../src/hooks/useAI';
import { useInvestmentReport } from '../../../src/hooks/useReports';
import { Screen } from '../../../src/components/layout/Screen';
import { ScreenHeader } from '../../../src/components/layout/ScreenHeader';
import { GlassCard } from '../../../src/components/ui/GlassCard';
import { Button } from '../../../src/components/ui/Button';
import { Avatar } from '../../../src/components/ui/Avatar';
import { Badge, StatusBadge } from '../../../src/components/ui/Badge';
import { SectionHeader } from '../../../src/components/ui/SectionHeader';
import { SegmentedTabs } from '../../../src/components/ui/SegmentedTabs';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { LoadingBlock } from '../../../src/components/ui/Spinner';
import { CountUpText } from '../../../src/components/ui/CountUpText';
import { AreaChart } from '../../../src/components/charts/AreaChart';
import { DonutChart, CHART_COLORS } from '../../../src/components/charts/DonutChart';
import { BarChart } from '../../../src/components/charts/BarChart';
import { DocumentUploadModal } from '../../../src/components/ai/DocumentUploadModal';
import { ExtractionReviewModal } from '../../../src/components/ai/ExtractionReviewModal';
import { AnomalyReportCard } from '../../../src/components/ai/AnomalyReportCard';
import { useToast } from '../../../src/components/feedback/Toast';
import { useConfirm } from '../../../src/components/feedback/ConfirmProvider';
import { InvestmentStatus, AIExtraction, TransactionType } from '../../../src/types/api';
import { colors, fonts, gradients, radius, shadow } from '../../../src/theme/tokens';
import { inr, inrCompact, isNegative, pct, shortDate, toNum } from '../../../src/theme/format';
import { enter } from '../../../src/theme/motion';

type TabView = 'overview' | 'contributions' | 'transactions' | 'audit' | 'settlement';

const TABS = [
  { id: 'overview' as TabView, label: 'Overview' },
  { id: 'contributions' as TabView, label: 'Capital' },
  { id: 'transactions' as TabView, label: 'Ledger' },
  { id: 'audit' as TabView, label: 'AI audit' },
  { id: 'settlement' as TabView, label: 'Payout' },
];

const TX_META: Record<TransactionType, { icon: keyof typeof Ionicons.glyphMap; fg: string; bg: string }> = {
  CONTRIBUTION: { icon: 'arrow-down-circle', fg: colors.gain, bg: colors.gainSoft },
  WITHDRAWAL: { icon: 'arrow-up-circle', fg: colors.loss, bg: colors.lossSoft },
  BUY: { icon: 'add-circle', fg: colors.info, bg: colors.infoSoft },
  SELL: { icon: 'remove-circle', fg: colors.warn, bg: colors.warnSoft },
  ALLOTMENT: { icon: 'ribbon', fg: '#6D28D9', bg: 'rgba(109,40,217,0.1)' },
  REFUND: { icon: 'return-down-back', fg: colors.info, bg: colors.infoSoft },
  DIVIDEND: { icon: 'cash', fg: colors.gain, bg: colors.gainSoft },
  FEE: { icon: 'receipt', fg: colors.loss, bg: colors.lossSoft },
  TAX: { icon: 'document-text', fg: colors.loss, bg: colors.lossSoft },
  ADJUSTMENT: { icon: 'construct', fg: colors.ink2, bg: 'rgba(11,31,23,0.07)' },
};

const NEXT: Partial<Record<InvestmentStatus, { to: InvestmentStatus; label: string; blurb: string }>> = {
  DRAFT: { to: 'OPEN', label: 'Open for contributions', blurb: 'Members will be able to add capital to this investment.' },
  OPEN: { to: 'LOCKED', label: 'Lock capital basis', blurb: 'Ownership percentages are fixed once capital is locked. This cannot be undone.' },
  LOCKED: { to: 'ACTIVE', label: 'Activate investment', blurb: 'Trading events can then be recorded on the ledger.' },
};

function StatRow({ label, value, tone, last, strong }: { label: string; value: string; tone?: 'gain' | 'loss'; last?: boolean; strong?: boolean }) {
  return (
    <View style={[styles.statRow, !last && styles.border]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text
        style={[
          styles.statValue,
          strong && { fontSize: 15 },
          tone === 'gain' && { color: colors.gain },
          tone === 'loss' && { color: colors.loss },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export default function InvestmentDetailScreen() {
  const { investmentId } = useLocalSearchParams<{ investmentId: string }>();
  const toast = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<TabView>('overview');
  const [refreshing, setRefreshing] = useState(false);

  const [isUploadVisible, setIsUploadVisible] = useState(false);
  const [isReviewVisible, setIsReviewVisible] = useState(false);
  const [activeExtraction, setActiveExtraction] = useState<AIExtraction | null>(null);

  const { data: inv, isLoading: invLoading, refetch: refetchInv } = useInvestment(investmentId);
  const { data: ownership, refetch: refetchOwn } = useOwnership(investmentId);
  const { data: pnl, refetch: refetchPnl } = usePnL(investmentId);
  const { data: settlements, refetch: refetchSet } = useSettlements(investmentId);
  const { data: contribSummary, refetch: refetchContrib } = useContributions(investmentId);
  const { data: txSummary, refetch: refetchTx } = useTransactions(investmentId);
  const { data: anomalyReport, isLoading: anomalyLoading, refetch: refetchAnomalies } = useAnomalyAnalysis(investmentId);

  const { downloadReport, isDownloading: isDownloadingPdf } = useInvestmentReport();
  const updateInvMutation = useUpdateInvestment(investmentId);
  const settleMutation = useSettleInvestment(investmentId);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchInv(), refetchOwn(), refetchPnl(), refetchSet(), refetchContrib(), refetchTx(), refetchAnomalies()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleStatusChange = async (next: { to: InvestmentStatus; label: string; blurb: string }) => {
    const ok = await confirm({
      title: next.label,
      message: next.blurb,
      confirmLabel: `Advance to ${next.to}`,
      icon: next.to === 'LOCKED' ? 'lock-closed' : 'arrow-forward-circle',
    });
    if (!ok) return;
    try {
      await updateInvMutation.mutateAsync({ status: next.to });
      toast.success(`Now ${next.to}`, 'Investment lifecycle updated.');
      onRefresh();
    } catch (err: any) {
      toast.error('Transition failed', err?.message || 'Could not update status');
    }
  };

  const handleSettle = async () => {
    const ok = await confirm({
      title: 'Settle & close?',
      message: 'This finalizes every member’s payout and closes the investment. It cannot be reversed.',
      confirmLabel: 'Settle now',
      tone: 'danger',
      icon: 'flag',
    });
    if (!ok) return;
    try {
      await settleMutation.mutateAsync();
      toast.success('Investment settled', 'Final payouts are recorded.');
      onRefresh();
    } catch (err: any) {
      toast.error('Settlement failed', err?.message || 'Could not settle investment');
    }
  };

  const handleDownloadPdf = async () => {
    try {
      await downloadReport(investmentId);
    } catch (err: any) {
      toast.error('Report failed', err?.message || 'Unable to open investment report');
    }
  };

  const handleExtractionSuccess = (extraction: AIExtraction) => {
    setIsUploadVisible(false);
    setActiveExtraction(extraction);
    // Let the upload sheet finish dismissing before presenting the next one.
    setTimeout(() => setIsReviewVisible(true), 320);
  };

  if (invLoading) {
    return (
      <Screen scroll={false} header={<ScreenHeader title="Investment" />}>
        <LoadingBlock fill label="Loading investment…" />
      </Screen>
    );
  }

  if (!inv) {
    return (
      <Screen scroll={false} header={<ScreenHeader title="Investment" />}>
        <GlassCard>
          <EmptyState icon="alert-circle-outline" title="Investment not found" message="It may have been removed or you no longer have access." />
        </GlassCard>
      </Screen>
    );
  }

  const flaggedTxMap = new Map(anomalyReport?.transactions?.filter((t) => t.isAnomaly).map((t) => [t.transactionId, t]) || []);
  const netNeg = pnl ? isNegative(pnl.netPnl) : false;
  const next = NEXT[inv.status];

  const owners = ownership?.members ?? [];
  const donutSegments = owners.map((m, i) => ({
    label: m.userName,
    value: toNum(String(m.ownershipPercentage).replace('%', '')),
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const orderedContribs = [...(contribSummary?.contributions ?? [])].sort(
    (a, b) => new Date(a.contributedAt).getTime() - new Date(b.contributedAt).getTime()
  );

  return (
    <>
      <Screen
        refreshing={refreshing}
        onRefresh={onRefresh}
        header={
          <ScreenHeader
            title={inv.name}
            subtitle={`${inv.symbol} · ${inv.type}${inv.exchange ? ` · ${inv.exchange}` : ''}`}
            right={<StatusBadge status={inv.status} />}
          />
        }
      >
        {/* Hero */}
        <Animated.View entering={enter(0)} style={[styles.heroShadow, shadow.glow]}>
          <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.orb} />
            <Text style={styles.heroLabel}>NET P&L · SERVER</Text>
            <View style={styles.heroRow}>
              {pnl ? (
                <CountUpText value={toNum(pnl.netPnl)} format={(n) => inr(n, { sign: true })} style={styles.heroValue} />
              ) : (
                <Text style={styles.heroValue}>—</Text>
              )}
              {pnl ? (
                <View style={[styles.retPill, { backgroundColor: netNeg ? 'rgba(254,202,202,0.25)' : 'rgba(167,243,208,0.22)' }]}>
                  <Ionicons name={netNeg ? 'trending-down' : 'trending-up'} size={14} color={netNeg ? '#FECACA' : '#A7F3D0'} />
                  <Text style={[styles.retText, { color: netNeg ? '#FECACA' : '#A7F3D0' }]}>{pct(pnl.returnPercentage)}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.miniRow}>
              {[
                { l: 'Locked capital', v: inrCompact(ownership?.totalLockedCapital) },
                { l: 'Current value', v: pnl ? inrCompact(pnl.currentValue) : '—' },
                { l: 'Contributors', v: String(ownership?.contributorCount ?? 0) },
              ].map((m, i) => (
                <View key={m.l} style={[styles.mini, i > 0 && styles.miniDivider]}>
                  <Text style={styles.miniV}>{m.v}</Text>
                  <Text style={styles.miniL}>{m.l}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Actions */}
        <Animated.View entering={enter(1)} style={styles.actions}>
          <Button title="PDF report" icon="document-text-outline" variant="secondary" size="sm" style={{ flex: 1 }} onPress={handleDownloadPdf} isLoading={isDownloadingPdf} />
          <Button title="AI import" icon="sparkles" variant="soft" size="sm" style={{ flex: 1 }} onPress={() => setIsUploadVisible(true)} />
        </Animated.View>

        {next ? (
          <Animated.View entering={enter(2)} style={{ marginBottom: 14 }}>
            <Button title={next.label} icon="arrow-forward" onPress={() => handleStatusChange(next)} isLoading={updateInvMutation.isPending} />
          </Animated.View>
        ) : null}
        {inv.status === 'ACTIVE' ? (
          <Animated.View entering={enter(2)} style={{ marginBottom: 14 }}>
            <Button title="Settle & close" variant="danger" icon="flag" onPress={handleSettle} isLoading={settleMutation.isPending} />
          </Animated.View>
        ) : null}

        <SegmentedTabs tabs={TABS} value={activeTab} onChange={setActiveTab} />

        <Animated.View key={activeTab} entering={FadeIn.duration(260)}>
          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <View>
              <GlassCard>
                <Text style={styles.cardTitle}>Ownership</Text>
                {owners.length === 0 ? (
                  <EmptyState compact icon="pie-chart-outline" title="No locked contributions" message="Ownership appears once capital is contributed and locked." />
                ) : (
                  <View style={styles.donutRow}>
                    <DonutChart segments={donutSegments} size={150} thickness={18} centerTop={String(owners.length)} centerBottom={owners.length === 1 ? 'OWNER' : 'OWNERS'} />
                    <View style={{ flex: 1, gap: 11 }}>
                      {owners.map((m, i) => (
                        <View key={m.userId} style={styles.legend}>
                          <View style={[styles.dot, { backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.legendName} numberOfLines={1}>{m.userName}</Text>
                            <Text style={styles.legendSub}>{inrCompact(m.lockedContribution)}</Text>
                          </View>
                          <Text style={styles.legendPct}>{m.ownershipPercentage}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </GlassCard>

              <AnomalyReportCard investmentId={investmentId} report={anomalyReport} isLoading={anomalyLoading} onRefresh={refetchAnomalies} />

              {pnl ? (
                <>
                  <SectionHeader title="Trading performance" />
                  <GlassCard padded={false}>
                    <StatRow label="Total invested" value={inr(pnl.totalInvested)} />
                    <StatRow label="Realized P&L" value={inr(pnl.totalRealizedPnl, { sign: true })} tone={isNegative(pnl.totalRealizedPnl) ? 'loss' : 'gain'} />
                    <StatRow label="Unrealized P&L" value={inr(pnl.totalUnrealizedPnl, { sign: true })} tone={isNegative(pnl.totalUnrealizedPnl) ? 'loss' : 'gain'} />
                    <StatRow label="Dividends" value={inr(pnl.totalDividends, { sign: true })} tone="gain" />
                    <StatRow label="Fees" value={inr(pnl.totalFees)} tone="loss" />
                    <StatRow label="Taxes" value={inr(pnl.totalTaxes)} tone="loss" />
                    <StatRow label="Net P&L" value={inr(pnl.netPnl, { sign: true })} tone={netNeg ? 'loss' : 'gain'} strong last />
                  </GlassCard>
                </>
              ) : null}
            </View>
          )}

          {/* CAPITAL */}
          {activeTab === 'contributions' && (
            <View>
              <GlassCard>
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle}>By member</Text>
                  <Text style={styles.cardRight}>Total {inr(contribSummary?.totalAmount)}</Text>
                </View>
                {contribSummary?.memberBreakdown && contribSummary.memberBreakdown.length > 0 ? (
                  <BarChart
                    bars={contribSummary.memberBreakdown.map((b, i) => ({
                      label: b.userName.split(' ')[0],
                      value: toNum(b.totalAmount),
                      display: inrCompact(b.totalAmount),
                      color: CHART_COLORS[i % CHART_COLORS.length],
                    }))}
                  />
                ) : (
                  <EmptyState compact icon="bar-chart-outline" title="No contributions yet" />
                )}
              </GlassCard>

              {orderedContribs.length > 1 ? (
                <GlassCard>
                  <Text style={styles.cardTitle}>Contribution flow</Text>
                  <Text style={styles.cardSub}>Each deposit in order · drag to inspect</Text>
                  <View style={{ marginTop: 14 }}>
                    <AreaChart
                      data={orderedContribs.map((c) => toNum(c.amount))}
                      labels={orderedContribs.map((c) => `${c.user?.name ?? 'Member'} · ${shortDate(c.contributedAt)}`)}
                      formatValue={(n) => inr(n)}
                      height={120}
                    />
                  </View>
                </GlassCard>
              ) : null}

              <SectionHeader title="Contributions" right={`${orderedContribs.length} entries`} />
              <GlassCard padded={false}>
                {orderedContribs.length === 0 ? (
                  <Text style={styles.emptyLine}>No contributions recorded.</Text>
                ) : (
                  [...orderedContribs].reverse().map((c, i, arr) => (
                    <View key={c.id} style={[styles.item, i < arr.length - 1 && styles.border]}>
                      <Avatar name={c.user?.name} size={38} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle}>{c.user?.name || 'Member'}</Text>
                        <Text style={styles.itemSub}>{shortDate(c.contributedAt)}</Text>
                      </View>
                      <Text style={styles.itemAmt}>{inr(c.amount)}</Text>
                    </View>
                  ))
                )}
              </GlassCard>
            </View>
          )}

          {/* LEDGER */}
          {activeTab === 'transactions' && (
            <View>
              <SectionHeader title="Ledger history" right={`${txSummary?.totalCount ?? 0} events`} />
              <GlassCard padded={false}>
                {!txSummary?.transactions || txSummary.transactions.length === 0 ? (
                  <Text style={styles.emptyLine}>No ledger transactions yet.</Text>
                ) : (
                  txSummary.transactions.map((tx, i, arr) => {
                    const anomaly = flaggedTxMap.get(tx.id);
                    const m = TX_META[tx.type];
                    return (
                      <View key={tx.id} style={[styles.item, i < arr.length - 1 && styles.border]}>
                        <View style={[styles.txIcon, { backgroundColor: m.bg }]}>
                          <Ionicons name={m.icon} size={20} color={m.fg} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.txTitleRow}>
                            <Text style={styles.itemTitle}>{tx.type}</Text>
                            {tx.quantity ? <Text style={styles.qty}>×{tx.quantity}</Text> : null}
                            {anomaly ? <Badge label="UNUSUAL" variant="warning" /> : null}
                          </View>
                          <Text style={styles.itemSub} numberOfLines={1}>
                            {tx.reference ? `${tx.reference} · ` : ''}
                            {shortDate(tx.transactionDate)}
                          </Text>
                        </View>
                        <Text style={styles.itemAmt}>{inr(tx.amount)}</Text>
                      </View>
                    );
                  })
                )}
              </GlassCard>
            </View>
          )}

          {/* AUDIT */}
          {activeTab === 'audit' && (
            <View>
              <AnomalyReportCard investmentId={investmentId} report={anomalyReport} isLoading={anomalyLoading} onRefresh={refetchAnomalies} />
              <SectionHeader title="Pattern breakdown" right={`${anomalyReport?.anomaliesDetectedCount ?? 0} flagged`} />
              <GlassCard padded={false}>
                {!anomalyReport?.transactions || anomalyReport.transactions.length === 0 ? (
                  <Text style={styles.emptyLine}>No audit records yet. Run the pattern audit to inspect the ledger.</Text>
                ) : (
                  anomalyReport.transactions.map((tx, i, arr) => (
                    <View key={tx.transactionId} style={[styles.auditItem, i < arr.length - 1 && styles.border]}>
                      <View style={styles.auditTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemTitle}>{tx.type} · {inr(tx.amount)}</Text>
                          <Text style={styles.itemSub}>{shortDate(tx.transactionDate)}</Text>
                        </View>
                        <Badge label={`${tx.isAnomaly ? 'UNUSUAL' : 'NORMAL'} ${(tx.anomalyScore * 100).toFixed(0)}%`} variant={tx.isAnomaly ? 'warning' : 'success'} />
                      </View>
                      {tx.contributingFactors?.length ? (
                        <View style={styles.factors}>
                          {tx.contributingFactors.map((f, fi) => (
                            <Text key={fi} style={styles.factor}>
                              <Text style={{ fontFamily: fonts.sansBold, color: colors.ink }}>{f.feature}: </Text>
                              {f.description}
                            </Text>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  ))
                )}
              </GlassCard>
            </View>
          )}

          {/* PAYOUT */}
          {activeTab === 'settlement' && (
            <View>
              <GlassCard>
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle}>{settlements?.isSettled ? 'Final settlement' : 'Projected payouts'}</Text>
                  {settlements?.isSettled ? <Badge label="SETTLED" variant="success" dot /> : <Badge label="PROJECTED" variant="info" />}
                </View>
                <View style={styles.sumRow}>
                  <View style={styles.sum}>
                    <Text style={styles.sumL}>Invested</Text>
                    <Text style={styles.sumV}>{inrCompact(settlements?.totalInvested)}</Text>
                  </View>
                  <View style={[styles.sum, styles.miniDivider2]}>
                    <Text style={styles.sumL}>P&L</Text>
                    <Text style={[styles.sumV, { color: isNegative(settlements?.totalProfitLoss) ? colors.loss : colors.gain }]}>
                      {inrCompact(settlements?.totalProfitLoss)}
                    </Text>
                  </View>
                  <View style={[styles.sum, styles.miniDivider2]}>
                    <Text style={styles.sumL}>Payout</Text>
                    <Text style={[styles.sumV, { color: colors.primaryDark }]}>{inrCompact(settlements?.totalFinalPayout)}</Text>
                  </View>
                </View>
              </GlassCard>

              <GlassCard padded={false}>
                {!settlements?.settlements || settlements.settlements.length === 0 ? (
                  <Text style={styles.emptyLine}>No settlement data available.</Text>
                ) : (
                  settlements.settlements.map((s, i, arr) => (
                    <View key={s.userId} style={[styles.item, i < arr.length - 1 && styles.border]}>
                      <Avatar name={s.userName} size={40} index={i} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle}>{s.userName}</Text>
                        <Text style={styles.itemSub}>
                          {inrCompact(s.investedAmount)} in ·{' '}
                          <Text style={{ color: isNegative(s.profitLoss) ? colors.loss : colors.gain }}>{inrCompact(s.profitLoss)}</Text> P&L
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.itemAmt, { color: colors.primaryDark }]}>{inr(s.finalAmount)}</Text>
                        <Text style={styles.itemSub}>{s.ownershipPercentage}</Text>
                      </View>
                    </View>
                  ))
                )}
              </GlassCard>
            </View>
          )}
        </Animated.View>
      </Screen>

      <DocumentUploadModal
        visible={isUploadVisible}
        investmentId={investmentId}
        symbol={inv.symbol}
        onClose={() => setIsUploadVisible(false)}
        onExtractionSuccess={handleExtractionSuccess}
      />

      <ExtractionReviewModal
        visible={isReviewVisible}
        investmentId={investmentId}
        extraction={activeExtraction}
        onClose={() => {
          setIsReviewVisible(false);
          setTimeout(() => setActiveExtraction(null), 320);
        }}
        onSuccess={() => {
          setIsReviewVisible(false);
          setTimeout(() => setActiveExtraction(null), 320);
          toast.success('Recorded to ledger', 'The AI-proposed transaction was confirmed.');
          onRefresh();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  heroShadow: { borderRadius: 28, marginBottom: 14 },
  hero: { borderRadius: 28, padding: 20, overflow: 'hidden' },
  orb: { position: 'absolute', width: 220, height: 220, borderRadius: 110, right: -70, top: -90, backgroundColor: 'rgba(255,255,255,0.09)' },
  heroLabel: { fontFamily: fonts.sansBold, fontSize: 11.5, color: colors.onHeroMuted, letterSpacing: 1.6 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 8 },
  heroValue: { fontFamily: fonts.monoBold, fontSize: 30, color: colors.white, letterSpacing: -0.8, flexShrink: 1 },
  retPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
  retText: { fontFamily: fonts.monoBold, fontSize: 12.5 },
  miniRow: { flexDirection: 'row', marginTop: 18, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 16, paddingVertical: 11 },
  mini: { flex: 1, alignItems: 'center' },
  miniDivider: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)' },
  miniV: { fontFamily: fonts.monoBold, fontSize: 14.5, color: colors.white },
  miniL: { fontFamily: fonts.sansMedium, fontSize: 10.5, color: colors.onHeroMuted, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  cardTitle: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.ink },
  cardSub: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted, marginTop: 2 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardRight: { fontFamily: fonts.monoBold, fontSize: 12, color: colors.primaryDark },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 14 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendName: { fontFamily: fonts.sansSemi, fontSize: 13, color: colors.ink },
  legendSub: { fontFamily: fonts.mono, fontSize: 10.5, color: colors.muted, marginTop: 1 },
  legendPct: { fontFamily: fonts.monoBold, fontSize: 12.5, color: colors.ink },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  border: { borderBottomWidth: 1, borderBottomColor: colors.border },
  statLabel: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink2 },
  statValue: { fontFamily: fonts.monoBold, fontSize: 13.5, color: colors.ink },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  itemTitle: { fontFamily: fonts.sansBold, fontSize: 14.5, color: colors.ink },
  itemSub: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.muted, marginTop: 2 },
  itemAmt: { fontFamily: fonts.monoBold, fontSize: 13.5, color: colors.ink },
  txIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  txTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  qty: { fontFamily: fonts.mono, fontSize: 11.5, color: colors.muted },
  emptyLine: { fontFamily: fonts.sans, fontSize: 13.5, color: colors.ink2, padding: 18, textAlign: 'center' },
  auditItem: { padding: 14 },
  auditTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  factors: { backgroundColor: 'rgba(11,31,23,0.04)', borderRadius: 12, padding: 10, marginTop: 10, gap: 4 },
  factor: { fontFamily: fonts.sans, fontSize: 12, color: colors.ink2, lineHeight: 18 },
  sumRow: { flexDirection: 'row' },
  sum: { flex: 1, alignItems: 'center' },
  miniDivider2: { borderLeftWidth: 1, borderLeftColor: colors.border },
  sumL: { fontFamily: fonts.sansMedium, fontSize: 11.5, color: colors.muted },
  sumV: { fontFamily: fonts.monoBold, fontSize: 16, color: colors.ink, marginTop: 4 },
});
