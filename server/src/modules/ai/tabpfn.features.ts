import { Prisma, TransactionType } from '@prisma/client';
import { TransactionFeatureVector } from './tabpfn.types';

export interface RawTransactionInput {
  id: string;
  type: TransactionType;
  amount: Prisma.Decimal;
  quantity?: Prisma.Decimal | null;
  price?: Prisma.Decimal | null;
  transactionDate: Date;
  userId?: string | null;
}

export class TabPFNFeatureExtractor {
  /**
   * Deterministically extract tabular features from transaction history for an investment.
   */
  public static extractFeatures(
    transactions: RawTransactionInput[],
    totalLockedCapital: number = 0
  ): TransactionFeatureVector[] {
    if (transactions.length === 0) {
      return [];
    }

    // Sort chronologically for timing features
    const sorted = [...transactions].sort(
      (a, b) => a.transactionDate.getTime() - b.transactionDate.getTime()
    );

    const amounts = sorted.map((t) => t.amount.toNumber());
    const count = amounts.length;

    // 1. Mean, StdDev, and Median of amounts
    const meanAmount = amounts.reduce((acc, val) => acc + val, 0) / count;
    const variance =
      count > 1
        ? amounts.reduce((acc, val) => acc + Math.pow(val - meanAmount, 2), 0) / (count - 1)
        : 0;
    const stdDevAmount = Math.sqrt(variance);

    const sortedAmounts = [...amounts].sort((a, b) => a - b);
    const medianAmount =
      count % 2 === 0
        ? (sortedAmounts[count / 2 - 1] + sortedAmounts[count / 2]) / 2
        : sortedAmounts[Math.floor(count / 2)];

    // 2. Transaction Type Frequencies
    const typeCounts: Record<string, number> = {};
    for (const t of sorted) {
      typeCounts[t.type] = (typeCounts[t.type] || 0) + 1;
    }

    // 3. User Frequencies
    const userCounts: Record<string, number> = {};
    for (const t of sorted) {
      if (t.userId) {
        userCounts[t.userId] = (userCounts[t.userId] || 0) + 1;
      }
    }

    // 4. Average execution price for BUY/SELL
    const prices = sorted
      .filter((t) => t.price && t.price.toNumber() > 0)
      .map((t) => t.price!.toNumber());
    const meanPrice =
      prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

    // 5. Build feature vector for each transaction
    return sorted.map((t, idx) => {
      const amt = t.amount.toNumber();
      const zScoreAmount =
        stdDevAmount > 0 ? (amt - meanAmount) / stdDevAmount : 0;

      const ratioToTotalCapital =
        totalLockedCapital > 0 ? amt / totalLockedCapital : (meanAmount > 0 ? amt / meanAmount : 1);

      const ratioToMedian = medianAmount > 0 ? amt / medianAmount : 1;

      const typeFrequencyRatio = (typeCounts[t.type] || 1) / count;
      const userFrequencyRatio = t.userId ? (userCounts[t.userId] || 1) / count : 1;

      // Time difference from previous transaction in hours
      let timeDeltaHours = 0;
      if (idx > 0) {
        const prevDate = sorted[idx - 1].transactionDate;
        const diffMs = t.transactionDate.getTime() - prevDate.getTime();
        timeDeltaHours = Math.max(0, diffMs / (1000 * 60 * 60));
      }

      // Price deviation ratio
      let priceDeviationRatio = 0;
      if (t.price && meanPrice > 0) {
        priceDeviationRatio = Math.abs(t.price.toNumber() - meanPrice) / meanPrice;
      }

      return {
        transactionId: t.id,
        type: t.type,
        amount: amt,
        quantity: t.quantity ? t.quantity.toNumber() : undefined,
        price: t.price ? t.price.toNumber() : undefined,
        transactionDate: t.transactionDate,
        userId: t.userId,
        zScoreAmount,
        ratioToMedian,
        ratioToTotalCapital,
        typeFrequencyRatio,
        userFrequencyRatio,
        timeDeltaHours,
        priceDeviationRatio,
      };
    });
  }
}
