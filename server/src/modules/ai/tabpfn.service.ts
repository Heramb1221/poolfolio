import prisma from '../../config/prisma';
import { ForbiddenError, NotFoundError } from '../../utils/errors';
import { TabPFNFeatureExtractor } from './tabpfn.features';
import { tabpfnClient } from './tabpfn.client';
import { InvestmentAnomalyReport, TransactionAnomalyResult } from './tabpfn.types';

export class TabPFNService {
  // In-memory cache of latest analysis keyed by investmentId
  private analysisCache = new Map<string, InvestmentAnomalyReport>();

  /**
   * Helper to verify investment existence and group membership.
   */
  private async getInvestmentWithMembership(investmentId: string, userId: string) {
    const investment = await prisma.investment.findUnique({
      where: { id: investmentId },
      include: {
        group: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!investment) {
      throw new NotFoundError('Investment not found');
    }

    if (investment.group.members.length === 0) {
      throw new ForbiddenError('You do not belong to the group associated with this investment');
    }

    return investment;
  }

  /**
   * Run TabPFN anomaly analysis on an investment's transaction history.
   */
  public async analyzeInvestment(investmentId: string, userId: string): Promise<InvestmentAnomalyReport> {
    const investment = await this.getInvestmentWithMembership(investmentId, userId);

    // Retrieve all transactions for this investment with user metadata
    const transactions = await prisma.transaction.findMany({
      where: { investmentId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { transactionDate: 'asc' },
    });

    // Retrieve total capital from locked contributions
    const contributions = await prisma.contribution.findMany({
      where: { investmentId },
    });
    const totalCapital = contributions.reduce((sum, c) => sum + c.amount.toNumber(), 0);

    if (transactions.length === 0) {
      const emptyReport: InvestmentAnomalyReport = {
        investmentId,
        investmentName: investment.name,
        symbol: investment.symbol,
        analyzedAt: new Date(),
        totalTransactionsAnalyzed: 0,
        anomaliesDetectedCount: 0,
        overallRiskScore: 0.0,
        summary: 'No transactions recorded yet to analyze for pattern anomalies.',
        transactions: [],
      };
      this.analysisCache.set(investmentId, emptyReport);
      return emptyReport;
    }

    // 1. Extract feature vectors
    const featureVectors = TabPFNFeatureExtractor.extractFeatures(transactions, totalCapital);

    // 2. Run prediction via TabPFN client
    const predictions = await tabpfnClient.predictAnomalies(featureVectors);
    const predictionMap = new Map(predictions.map((p) => [p.transactionId, p]));

    // 3. Assemble detailed results
    const results: TransactionAnomalyResult[] = transactions.map((t) => {
      const pred = predictionMap.get(t.id);
      return {
        transactionId: t.id,
        type: t.type,
        amount: t.amount.toFixed(4),
        transactionDate: t.transactionDate,
        reference: t.reference,
        userId: t.userId,
        userName: t.user?.name || null,
        anomalyScore: pred ? pred.anomalyScore : 0.0,
        isAnomaly: pred ? pred.isAnomaly : false,
        contributingFactors: pred ? pred.contributingFactors : [],
      };
    });

    const anomaliesCount = results.filter((r) => r.isAnomaly).length;
    const maxScore = results.length > 0 ? Math.max(...results.map((r) => r.anomalyScore)) : 0;

    let summaryText = `Analyzed ${results.length} ledger transaction(s). `;
    if (anomaliesCount === 0) {
      summaryText += 'All transactions align with typical historical patterns.';
    } else {
      summaryText += `${anomaliesCount} transaction(s) exhibit unusual patterns requiring member awareness.`;
    }

    const report: InvestmentAnomalyReport = {
      investmentId,
      investmentName: investment.name,
      symbol: investment.symbol,
      analyzedAt: new Date(),
      totalTransactionsAnalyzed: results.length,
      anomaliesDetectedCount: anomaliesCount,
      overallRiskScore: maxScore,
      summary: summaryText,
      transactions: results,
    };

    // Cache the analysis
    this.analysisCache.set(investmentId, report);

    return report;
  }

  /**
   * Retrieve the latest analysis report for an investment.
   */
  public async getLatestAnalysis(investmentId: string, userId: string): Promise<InvestmentAnomalyReport> {
    await this.getInvestmentWithMembership(investmentId, userId);

    const cached = this.analysisCache.get(investmentId);
    if (cached) {
      return cached;
    }

    // If not cached, trigger analysis
    return this.analyzeInvestment(investmentId, userId);
  }
}

export const tabpfnService = new TabPFNService();
