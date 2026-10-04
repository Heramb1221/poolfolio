import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { InvestmentAnomalyReport } from '../../types/api';
import { useRunAnomalyAnalysis } from '../../hooks/useAI';
import { useToast } from '../feedback/Toast';
import { colors, fonts } from '../../theme/tokens';
import { inr, shortDate } from '../../theme/format';

interface AnomalyReportCardProps {
  investmentId: string;
  report?: InvestmentAnomalyReport;
  isLoading: boolean;
  onRefresh: () => void;
}

function RiskMeter({ value, high }: { value: number; high: boolean }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(Math.min(1, Math.max(0, value / 100)), { duration: 800, easing: Easing.out(Easing.cubic) });
  }, [value, p]);
  const bar = useAnimatedStyle(() => ({ width: `${p.value * 100}%` as `${number}%` }));
  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fillWrap, bar]}>
        <LinearGradient
          colors={high ? ['#FBBF24', '#D97706'] : ['#34D399', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

export function AnomalyReportCard({ investmentId, report, isLoading, onRefresh }: AnomalyReportCardProps) {
  const runMutation = useRunAnomalyAnalysis(investmentId);
  const toast = useToast();

  const handleRunAudit = async () => {
    try {
      await runMutation.mutateAsync();
      onRefresh();
      toast.success('Audit complete', 'Pattern analysis refreshed.');
    } catch (e: any) {
      toast.error('Audit failed', e?.message || 'Could not run pattern audit');
    }
  };

  const isBusy = isLoading || runMutation.isPending;
  const anomalies = report?.transactions.filter((t) => t.isAnomaly) || [];
  const riskScore = report ? Math.round(report.overallRiskScore * 100) : 0;
  const isHighRisk = riskScore >= 65;
  const tone = isHighRisk ? colors.warn : colors.gain;

  return (
    <GlassCard>
      <View style={styles.head}>
        <View style={styles.iconWrap}>
          <Ionicons name="shield-checkmark" size={18} color={colors.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Pattern audit</Text>
          <Text style={styles.sub}>TabPFN · advisory only</Text>
        </View>
        <Button title="Run audit" size="sm" variant="soft" icon="refresh" fullWidth={false} onPress={handleRunAudit} isLoading={isBusy} />
      </View>

      {report ? (
        <View style={{ marginTop: 16 }}>
          <View style={styles.meterHead}>
            <Text style={styles.meterLabel}>{isHighRisk ? 'Atypical patterns' : 'Normal cadence'}</Text>
            <Text style={[styles.meterVal, { color: tone }]}>{riskScore}%</Text>
          </View>
          <RiskMeter value={riskScore} high={isHighRisk} />
        </View>
      ) : null}

      <Text style={styles.summary}>
        {report?.summary || 'No analysis yet. Tap “Run audit” to check transaction patterns.'}
      </Text>

      {anomalies.length > 0 ? (
        <View style={styles.flagWrap}>
          <Text style={styles.flagTitle}>FLAGGED FOR REVIEW · {anomalies.length}</Text>
          {anomalies.map((a) => (
            <View key={a.transactionId} style={styles.flag}>
              <View style={styles.flagTop}>
                <Text style={styles.flagType}>
                  {a.type} · {inr(a.amount)}
                </Text>
                <Text style={styles.flagDate}>{shortDate(a.transactionDate)}</Text>
              </View>
              {a.contributingFactors.map((f, i) => (
                <View key={i} style={styles.factor}>
                  <View style={styles.bullet} />
                  <Text style={styles.factorText}>{f.description}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.sansBold, fontSize: 15.5, color: colors.ink },
  sub: { fontFamily: fonts.sansMedium, fontSize: 11.5, color: colors.muted },
  meterHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  meterLabel: { fontFamily: fonts.sansSemi, fontSize: 12.5, color: colors.ink2 },
  meterVal: { fontFamily: fonts.monoBold, fontSize: 13 },
  track: { height: 9, borderRadius: 5, backgroundColor: 'rgba(11,31,23,0.07)', overflow: 'hidden' },
  fillWrap: { height: 9, borderRadius: 5, overflow: 'hidden' },
  summary: { fontFamily: fonts.sans, fontSize: 13, color: colors.ink2, lineHeight: 20, marginTop: 14 },
  flagWrap: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border, gap: 10 },
  flagTitle: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.warn, letterSpacing: 1.2 },
  flag: { backgroundColor: colors.warnSoft, borderRadius: 14, padding: 12 },
  flagTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  flagType: { fontFamily: fonts.monoBold, fontSize: 12, color: colors.ink },
  flagDate: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.muted },
  factor: { flexDirection: 'row', gap: 8, marginTop: 3, alignItems: 'flex-start' },
  bullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.warn, marginTop: 7 },
  factorText: { flex: 1, fontFamily: fonts.sans, fontSize: 12, color: colors.ink2, lineHeight: 18 },
});
