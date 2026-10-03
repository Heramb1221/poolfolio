import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Card } from '../ui/Card';
import { InvestmentAnomalyReport } from '../../types/api';
import { useRunAnomalyAnalysis } from '../../hooks/useAI';

interface AnomalyReportCardProps {
  investmentId: string;
  report?: InvestmentAnomalyReport;
  isLoading: boolean;
  onRefresh: () => void;
}

export function AnomalyReportCard({
  investmentId,
  report,
  isLoading,
  onRefresh,
}: AnomalyReportCardProps) {
  const runMutation = useRunAnomalyAnalysis(investmentId);

  const handleRunAudit = async () => {
    try {
      await runMutation.mutateAsync();
      onRefresh();
    } catch {
      // Ignored, state handles feedback
    }
  };

  const isBusy = isLoading || runMutation.isPending;
  const anomalies = report?.transactions.filter((t) => t.isAnomaly) || [];
  const riskScore = report ? Math.round(report.overallRiskScore * 100) : 0;

  // Determine badge styling based on risk score
  const isHighRisk = riskScore >= 65;
  const badgeBg = isHighRisk ? 'bg-amber-500/15 border-amber-500/30' : 'bg-emerald-500/15 border-emerald-500/30';
  const badgeTextColor = isHighRisk ? 'text-amber-400' : 'text-emerald-400';

  return (
    <Card className="mb-4">
      {/* Header */}
      <View className="flex-row items-center justify-between pb-3 border-b border-slate-800">
        <View className="flex-row items-center gap-2">
          <Text className="text-white font-bold text-sm">TabPFN Pattern Audit</Text>
          <View className={`px-2 py-0.5 rounded-full border ${badgeBg}`}>
            <Text className={`text-[10px] font-bold ${badgeTextColor}`}>
              {isHighRisk ? `Atypical Patterns (${riskScore}%)` : `Normal Cadence (${riskScore}%)`}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleRunAudit}
          disabled={isBusy}
          className="bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700"
        >
          {isBusy ? (
            <ActivityIndicator size="small" color="#10b981" />
          ) : (
            <Text className="text-emerald-400 font-semibold text-xs">Run Audit</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Summary message */}
      <Text className="text-slate-300 text-xs mt-3 leading-5">
        {report?.summary || 'No anomaly analysis executed yet. Tap "Run Audit" to analyze transaction patterns.'}
      </Text>

      {/* Flagged transactions with explainable factors */}
      {anomalies.length > 0 && (
        <View className="mt-4 pt-3 border-t border-slate-800/80">
          <Text className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2">
            Flagged Transactions for Review ({anomalies.length}):
          </Text>
          <View className="gap-2.5">
            {anomalies.map((a) => (
              <View key={a.transactionId} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-white font-semibold text-xs">
                    {a.type} • INR {a.amount}
                  </Text>
                  <Text className="text-slate-400 text-[10px]">
                    {new Date(a.transactionDate).toLocaleDateString()}
                  </Text>
                </View>

                {/* Factors */}
                <View className="mt-2 gap-1">
                  {a.contributingFactors.map((f, fIdx) => (
                    <Text key={fIdx} className="text-amber-300/80 text-[11px] leading-4">
                      • {f.description}
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </Card>
  );
}
