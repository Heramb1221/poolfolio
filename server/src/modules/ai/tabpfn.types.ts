import { TransactionType } from '@prisma/client';

export interface TransactionFeatureVector {
  transactionId: string;
  type: TransactionType;
  amount: number;
  quantity?: number;
  price?: number;
  transactionDate: Date;
  userId?: string | null;
  // Computed features
  zScoreAmount: number;
  ratioToMedian: number;
  ratioToTotalCapital: number;
  typeFrequencyRatio: number;
  userFrequencyRatio: number;
  timeDeltaHours: number;
  priceDeviationRatio: number;
}

export interface AnomalyFactor {
  feature: string;
  description: string;
  impactScore: number; // 0.0 to 1.0
}

export interface TransactionAnomalyResult {
  transactionId: string;
  type: TransactionType;
  amount: string;
  transactionDate: Date;
  reference?: string | null;
  userId?: string | null;
  userName?: string | null;
  anomalyScore: number; // 0.00 to 1.00
  isAnomaly: boolean;
  contributingFactors: AnomalyFactor[];
}

export interface InvestmentAnomalyReport {
  investmentId: string;
  investmentName: string;
  symbol: string;
  analyzedAt: Date;
  totalTransactionsAnalyzed: number;
  anomaliesDetectedCount: number;
  overallRiskScore: number; // 0.00 to 1.00
  summary: string;
  transactions: TransactionAnomalyResult[];
}

export interface ITabPFNClient {
  predictAnomalies(features: TransactionFeatureVector[]): Promise<
    Array<{
      transactionId: string;
      anomalyScore: number;
      isAnomaly: boolean;
      contributingFactors: AnomalyFactor[];
    }>
  >;
}
