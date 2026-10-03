import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  useInvestment,
  useUpdateInvestment,
  useContributions,
  useTransactions,
  useCreateContribution,
} from '../../../src/hooks/useInvestments';
import {
  useOwnership,
  usePnL,
  useSettlements,
  useSettleInvestment,
} from '../../../src/hooks/useAccounting';
import { useAnomalyAnalysis } from '../../../src/hooks/useAI';
import { useInvestmentReport } from '../../../src/hooks/useReports';
import { Card } from '../../../src/components/ui/Card';
import { Button } from '../../../src/components/ui/Button';
import { StatusBadge } from '../../../src/components/ui/Badge';
import { DocumentUploadModal } from '../../../src/components/ai/DocumentUploadModal';
import { ExtractionReviewModal } from '../../../src/components/ai/ExtractionReviewModal';
import { AnomalyReportCard } from '../../../src/components/ai/AnomalyReportCard';
import { InvestmentStatus, AIExtraction } from '../../../src/types/api';

type TabView = 'overview' | 'contributions' | 'transactions' | 'audit' | 'settlement';

export default function InvestmentDetailScreen() {
  const { investmentId } = useLocalSearchParams<{ investmentId: string }>();
  const [activeTab, setActiveTab] = useState<TabView>('overview');

  // AI & Reports UI States
  const [isUploadVisible, setIsUploadVisible] = useState(false);
  const [isReviewVisible, setIsReviewVisible] = useState(false);
  const [activeExtraction, setActiveExtraction] = useState<AIExtraction | null>(null);

  const { data: inv, isLoading: invLoading, refetch: refetchInv } = useInvestment(investmentId);
  const { data: ownership, isLoading: ownLoading, refetch: refetchOwn } = useOwnership(investmentId);
  const { data: pnl, isLoading: pnlLoading, refetch: refetchPnl } = usePnL(investmentId);
  const { data: settlements, isLoading: setLoading, refetch: refetchSet } = useSettlements(investmentId);
  const { data: contribSummary, refetch: refetchContrib } = useContributions(investmentId);
  const { data: txSummary, refetch: refetchTx } = useTransactions(investmentId);
  const {
    data: anomalyReport,
    isLoading: anomalyLoading,
    refetch: refetchAnomalies,
  } = useAnomalyAnalysis(investmentId);

  const { downloadReport, isDownloading: isDownloadingPdf } = useInvestmentReport();
  const updateInvMutation = useUpdateInvestment(investmentId);
  const settleMutation = useSettleInvestment(investmentId);

  const isRefreshing = invLoading || ownLoading || pnlLoading || setLoading;

  const onRefresh = () => {
    refetchInv();
    refetchOwn();
    refetchPnl();
    refetchSet();
    refetchContrib();
    refetchTx();
    refetchAnomalies();
  };

  const handleStatusChange = (nextStatus: InvestmentStatus) => {
    Alert.alert(
      'Lifecycle Transition',
      `Advance investment to ${nextStatus}? This modifies workflow permissions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await updateInvMutation.mutateAsync({ status: nextStatus });
              onRefresh();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Transition failed');
            }
          },
        },
      ]
    );
  };

  const handleSettle = () => {
    Alert.alert(
      'Settle Investment',
      'Are you sure you want to finalize settlements and close this investment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Settle Now',
          style: 'destructive',
          onPress: async () => {
            try {
              await settleMutation.mutateAsync();
              onRefresh();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Settlement failed');
            }
          },
        },
      ]
    );
  };

  const handleDownloadPdf = async () => {
    try {
      await downloadReport(investmentId);
    } catch (err: any) {
      Alert.alert('Report Download Failed', err.message || 'Unable to open investment report');
    }
  };

  const handleExtractionSuccess = (extraction: AIExtraction) => {
    setActiveExtraction(extraction);
    setIsReviewVisible(true);
  };

  if (invLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  if (!inv) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-4">
        <Text className="text-white text-base">Investment not found.</Text>
      </View>
    );
  }

  // Create quick lookup for flagged transactions from TabPFN
  const flaggedTxMap = new Map(
    anomalyReport?.transactions
      ?.filter((t) => t.isAnomaly)
      .map((t) => [t.transactionId, t]) || []
  );

  return (
    <>
      <ScrollView
        className="flex-1 bg-background px-4 py-6"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#38bdf8" />
        }
      >
        {/* Investment Header */}
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1 mr-2">
            <Text className="text-white text-2xl font-bold">{inv.name}</Text>
            <Text className="text-primary text-sm font-mono font-semibold">
              {inv.symbol} · {inv.type} {inv.exchange ? `· ${inv.exchange}` : ''}
            </Text>
          </View>
          <StatusBadge status={inv.status} />
        </View>

        {/* Global Action Bar: PDF Report & AI Document Scanner */}
        <View className="flex-row gap-2 mb-4">
          <TouchableOpacity
            onPress={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="flex-1 bg-slate-800/80 border border-slate-700/60 rounded-xl py-2.5 px-3 flex-row items-center justify-center gap-2"
          >
            {isDownloadingPdf ? (
              <ActivityIndicator size="small" color="#38bdf8" />
            ) : (
              <Text className="text-slate-200 text-xs font-semibold">📄 PDF Report</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsUploadVisible(true)}
            className="flex-1 bg-cyan-950/60 border border-cyan-500/40 rounded-xl py-2.5 px-3 flex-row items-center justify-center gap-2"
          >
            <Text className="text-cyan-400 text-xs font-semibold">✨ AI Import (Gemma)</Text>
          </TouchableOpacity>
        </View>

        {/* Lifecycle Action Buttons */}
        <View className="flex-row gap-2 mb-5">
          {inv.status === 'DRAFT' && (
            <Button
              title="Open for Contributions"
              onPress={() => handleStatusChange('OPEN')}
              isLoading={updateInvMutation.isPending}
              className="flex-1 py-2.5"
            />
          )}
          {inv.status === 'OPEN' && (
            <Button
              title="Lock Capital Basis"
              variant="secondary"
              onPress={() => handleStatusChange('LOCKED')}
              isLoading={updateInvMutation.isPending}
              className="flex-1 py-2.5"
            />
          )}
          {inv.status === 'LOCKED' && (
            <Button
              title="Activate Investment"
              onPress={() => handleStatusChange('ACTIVE')}
              isLoading={updateInvMutation.isPending}
              className="flex-1 py-2.5"
            />
          )}
          {inv.status === 'ACTIVE' && (
            <Button
              title="Settle & Close"
              variant="danger"
              onPress={handleSettle}
              isLoading={settleMutation.isPending}
              className="flex-1 py-2.5"
            />
          )}
        </View>

        {/* Sub-navigation tabs */}
        <View className="flex-row border-b border-border mb-4">
          {(
            [
              { id: 'overview', label: 'Overview' },
              { id: 'contributions', label: 'Capital' },
              { id: 'transactions', label: 'Ledger' },
              { id: 'audit', label: 'AI Audit' },
              { id: 'settlement', label: 'Payout' },
            ] as const
          ).map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 items-center border-b-2 ${
                activeTab === tab.id ? 'border-primary' : 'border-transparent'
              }`}
            >
              <Text
                className={`text-xs font-semibold uppercase tracking-wider ${
                  activeTab === tab.id ? 'text-primary' : 'text-slate-400'
                }`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* TAB 1: OVERVIEW & PERFORMANCE */}
        {activeTab === 'overview' && (
          <View>
            {/* Key Metric Cards */}
            <View className="flex-row gap-3 mb-3">
              <Card className="flex-1 p-3">
                <Text className="text-slate-400 text-xs mb-1">Locked Capital</Text>
                <Text className="text-white text-lg font-bold">
                  ₹{ownership?.totalLockedCapital ?? '0.00'}
                </Text>
              </Card>
              <Card className="flex-1 p-3">
                <Text className="text-slate-400 text-xs mb-1">Net P&L (Server)</Text>
                <Text
                  className={`text-lg font-bold ${
                    pnl && !pnl.netPnl.startsWith('-')
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  ₹{pnl?.netPnl ?? '0.00'}
                </Text>
              </Card>
            </View>

            {/* TabPFN Pattern Audit Card */}
            <AnomalyReportCard
              investmentId={investmentId}
              report={anomalyReport}
              isLoading={anomalyLoading}
              onRefresh={refetchAnomalies}
            />

            {/* Ownership Breakdown */}
            <Text className="text-white font-bold text-base mb-2">
              Server Ownership Roster
            </Text>
            <Card>
              {!ownership?.members || ownership.members.length === 0 ? (
                <Text className="text-slate-400 text-sm">No locked contributions yet.</Text>
              ) : (
                ownership.members.map((m, idx) => (
                  <View
                    key={m.userId}
                    className={`py-2.5 flex-row justify-between items-center ${
                      idx < ownership.members.length - 1 ? 'border-b border-border' : ''
                    }`}
                  >
                    <View>
                      <Text className="text-white font-medium text-sm">{m.userName}</Text>
                      <Text className="text-slate-400 text-xs">₹{m.lockedContribution}</Text>
                    </View>
                    <Text className="text-primary font-mono font-bold text-sm">
                      {m.ownershipPercentage}
                    </Text>
                  </View>
                ))
              )}
            </Card>

            {/* Performance Summary */}
            {pnl && (
              <>
                <Text className="text-white font-bold text-base mb-2 mt-4">
                  Trading Performance
                </Text>
                <Card>
                  <View className="py-2 border-b border-border flex-row justify-between">
                    <Text className="text-slate-400 text-sm">Realized P&L</Text>
                    <Text className="text-white text-sm font-semibold">₹{pnl.totalRealizedPnl}</Text>
                  </View>
                  <View className="py-2 border-b border-border flex-row justify-between">
                    <Text className="text-slate-400 text-sm">Dividends</Text>
                    <Text className="text-emerald-400 text-sm font-semibold">
                      +₹{pnl.totalDividends}
                    </Text>
                  </View>
                  <View className="py-2 border-b border-border flex-row justify-between">
                    <Text className="text-slate-400 text-sm">Fees & Taxes</Text>
                    <Text className="text-rose-400 text-sm font-semibold">
                      -₹{(Number(pnl.totalFees) + Number(pnl.totalTaxes)).toFixed(4)}
                    </Text>
                  </View>
                  <View className="py-2 flex-row justify-between">
                    <Text className="text-slate-400 text-sm">Return %</Text>
                    <Text className="text-primary text-sm font-bold">{pnl.returnPercentage}</Text>
                  </View>
                </Card>
              </>
            )}
          </View>
        )}

        {/* TAB 2: CONTRIBUTIONS */}
        {activeTab === 'contributions' && (
          <View>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-white font-bold text-base">Contributions</Text>
              <Text className="text-slate-400 text-xs">
                Total: ₹{contribSummary?.totalAmount ?? '0.00'}
              </Text>
            </View>
            <Card>
              {!contribSummary?.contributions || contribSummary.contributions.length === 0 ? (
                <Text className="text-slate-400 text-sm">No contributions recorded.</Text>
              ) : (
                contribSummary.contributions.map((c, idx) => (
                  <View
                    key={c.id}
                    className={`py-3 flex-row justify-between items-center ${
                      idx < contribSummary.contributions.length - 1 ? 'border-b border-border' : ''
                    }`}
                  >
                    <View>
                      <Text className="text-white font-medium text-sm">
                        {c.user?.name || 'Member'}
                      </Text>
                      <Text className="text-slate-400 text-xs">
                        {new Date(c.contributedAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text className="text-white font-bold text-base">₹{c.amount}</Text>
                  </View>
                ))
              )}
            </Card>
          </View>
        )}

        {/* TAB 3: LEDGER TRANSACTIONS */}
        {activeTab === 'transactions' && (
          <View>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-white font-bold text-base">Ledger History</Text>
              <Text className="text-slate-400 text-xs">
                Events: {txSummary?.totalCount ?? 0}
              </Text>
            </View>
            <Card>
              {!txSummary?.transactions || txSummary.transactions.length === 0 ? (
                <Text className="text-slate-400 text-sm">No ledger transactions yet.</Text>
              ) : (
                txSummary.transactions.map((tx, idx) => {
                  const anomaly = flaggedTxMap.get(tx.id);
                  return (
                    <View
                      key={tx.id}
                      className={`py-3 flex-row justify-between items-center ${
                        idx < txSummary.transactions.length - 1 ? 'border-b border-border' : ''
                      }`}
                    >
                      <View className="flex-1 mr-2">
                        <View className="flex-row items-center gap-1.5 flex-wrap">
                          <Text className="text-white font-semibold text-sm">
                            {tx.type} {tx.quantity ? `(${tx.quantity} shares)` : ''}
                          </Text>
                          {anomaly ? (
                            <View className="bg-amber-500/15 border border-amber-500/40 px-1.5 py-0.5 rounded">
                              <Text className="text-amber-400 text-[10px] font-bold">
                                ⚠ Unusual Pattern
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text className="text-slate-400 text-xs mt-0.5">
                          {tx.reference ? `${tx.reference} · ` : ''}
                          {new Date(tx.transactionDate).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text className="text-white font-mono font-bold text-sm">
                        ₹{tx.amount}
                      </Text>
                    </View>
                  );
                })
              )}
            </Card>
          </View>
        )}

        {/* TAB 4: TABPFN AI AUDIT */}
        {activeTab === 'audit' && (
          <View>
            <AnomalyReportCard
              investmentId={investmentId}
              report={anomalyReport}
              isLoading={anomalyLoading}
              onRefresh={refetchAnomalies}
            />

            <View className="flex-row justify-between items-center mb-2 mt-4">
              <Text className="text-white font-bold text-base">Pattern Breakdown</Text>
              <Text className="text-slate-400 text-xs">
                {anomalyReport?.anomaliesDetectedCount ?? 0} flagged
              </Text>
            </View>

            <Card>
              {!anomalyReport?.transactions || anomalyReport.transactions.length === 0 ? (
                <Text className="text-slate-400 text-sm">
                  No transaction audit records. Run TabPFN analysis to inspect ledger patterns.
                </Text>
              ) : (
                anomalyReport.transactions.map((tx, idx) => (
                  <View
                    key={tx.transactionId}
                    className={`py-3 ${
                      idx < anomalyReport.transactions.length - 1 ? 'border-b border-border' : ''
                    }`}
                  >
                    <View className="flex-row justify-between items-start mb-1">
                      <View className="flex-1 mr-2">
                        <Text className="text-white font-medium text-sm">
                          {tx.type} · ₹{tx.amount}
                        </Text>
                        <Text className="text-slate-400 text-xs">
                          {new Date(tx.transactionDate).toLocaleDateString()}
                        </Text>
                      </View>
                      <View
                        className={`px-2 py-0.5 rounded-full ${
                          tx.isAnomaly
                            ? 'bg-amber-500/20 border border-amber-500/40'
                            : 'bg-emerald-500/20 border border-emerald-500/40'
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            tx.isAnomaly ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        >
                          {tx.isAnomaly ? 'Unusual' : 'Normal'} ({(tx.anomalyScore * 100).toFixed(0)}%)
                        </Text>
                      </View>
                    </View>

                    {tx.contributingFactors && tx.contributingFactors.length > 0 ? (
                      <View className="bg-slate-900/60 rounded-lg p-2 mt-2 gap-1">
                        {tx.contributingFactors.map((factor, fIdx) => (
                          <Text key={fIdx} className="text-slate-300 text-xs">
                            • <Text className="font-semibold text-slate-200">{factor.feature}:</Text>{' '}
                            {factor.description}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ))
              )}
            </Card>
          </View>
        )}

        {/* TAB 5: SETTLEMENTS */}
        {activeTab === 'settlement' && (
          <View>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-white font-bold text-base">
                {settlements?.isSettled ? 'Final Settlement Roster' : 'Projected Payouts'}
              </Text>
              <Text className="text-primary text-xs font-semibold">
                Payout: ₹{settlements?.totalFinalPayout ?? '0.00'}
              </Text>
            </View>
            <Card>
              {!settlements?.settlements || settlements.settlements.length === 0 ? (
                <Text className="text-slate-400 text-sm">No settlement data available.</Text>
              ) : (
                settlements.settlements.map((s, idx) => (
                  <View
                    key={s.userId}
                    className={`py-3 flex-row justify-between items-center ${
                      idx < settlements.settlements.length - 1 ? 'border-b border-border' : ''
                    }`}
                  >
                    <View>
                      <Text className="text-white font-medium text-sm">{s.userName}</Text>
                      <Text className="text-slate-400 text-xs">
                        Capital: ₹{s.investedAmount} · P&L: ₹{s.profitLoss}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-emerald-400 font-bold text-base">
                        ₹{s.finalAmount}
                      </Text>
                      <Text className="text-slate-400 text-xs">{s.ownershipPercentage}</Text>
                    </View>
                  </View>
                ))
              )}
            </Card>
          </View>
        )}
      </ScrollView>

      {/* AI Modals */}
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
          setActiveExtraction(null);
        }}
        onSuccess={() => {
          setIsReviewVisible(false);
          setActiveExtraction(null);
          onRefresh();
        }}
      />
    </>
  );
}

