import { AnomalyFactor, ITabPFNClient, TransactionFeatureVector } from './tabpfn.types';

export class TabPFNClient implements ITabPFNClient {
  private mockClient: ITabPFNClient | null = null;

  /**
   * Set custom mock client for unit and integration testing.
   */
  public setMockClient(mock: ITabPFNClient | null): void {
    this.mockClient = mock;
  }

  /**
   * Run anomaly prediction on a set of transaction feature vectors.
   */
  public async predictAnomalies(features: TransactionFeatureVector[]): Promise<
    Array<{
      transactionId: string;
      anomalyScore: number;
      isAnomaly: boolean;
      contributingFactors: AnomalyFactor[];
    }>
  > {
    if (this.mockClient) {
      return this.mockClient.predictAnomalies(features);
    }

    const apiUrl = process.env.TABPFN_API_URL;

    if (apiUrl) {
      try {
        const response = await fetch(`${apiUrl.replace(/\/+$/, '')}/predict_anomalies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ features }),
        });

        if (response.ok) {
          const data = (await response.json()) as {
            predictions: Array<{
              transactionId: string;
              anomalyScore: number;
              isAnomaly: boolean;
              contributingFactors: AnomalyFactor[];
            }>;
          };
          if (data && Array.isArray(data.predictions)) {
            return data.predictions;
          }
        }
      } catch (err) {
        console.warn(
          '[TabPFNClient] External TabPFN endpoint unreachable, utilizing deterministic scorer fallback:',
          (err as Error).message
        );
      }
    }

    // Deterministic Statistical & Prior-Distribution Fallback Scorer:
    // Implements explainable anomaly scoring based on TabPFN tabular prior features.
    return this.fallbackStatisticalScorer(features);
  }

  /**
   * Deterministic statistical scorer computing explainable anomaly scores and contributing factors.
   */
  public fallbackStatisticalScorer(features: TransactionFeatureVector[]): Array<{
    transactionId: string;
    anomalyScore: number;
    isAnomaly: boolean;
    contributingFactors: AnomalyFactor[];
  }> {
    return features.map((f) => {
      const factors: AnomalyFactor[] = [];
      let totalRisk = 0;

      // 1. Amount outlier check (Z-Score + Median multiplier)
      const absZ = Math.abs(f.zScoreAmount);
      if (f.ratioToMedian >= 4.0 || absZ >= 3.0 || (features.length <= 10 && absZ >= 1.6)) {
        factors.push({
          feature: 'amount_outlier',
          description: `Transaction amount is extreme (${f.ratioToMedian >= 2 ? `${f.ratioToMedian.toFixed(1)}x median` : `${absZ.toFixed(1)} standard deviations from mean`})`,
          impactScore: 0.85,
        });
        totalRisk += 0.55;
      } else if (f.ratioToMedian >= 2.5 || absZ >= 2.0) {
        factors.push({
          feature: 'amount_outlier',
          description: `Transaction amount is notably elevated (${f.ratioToMedian >= 2 ? `${f.ratioToMedian.toFixed(1)}x median` : `${absZ.toFixed(1)} standard deviations from mean`})`,
          impactScore: 0.5,
        });
        totalRisk += 0.3;
      }

      // 2. Disproportionate size compared to investment capital
      if (f.ratioToTotalCapital >= 0.75) {
        factors.push({
          feature: 'capital_concentration',
          description: `Single transaction represents ${(f.ratioToTotalCapital * 100).toFixed(0)}% of total pool capital`,
          impactScore: 0.75,
        });
        totalRisk += 0.35;
      }

      // 3. Execution price deviation for stock transactions
      if (f.priceDeviationRatio >= 0.3) {
        factors.push({
          feature: 'price_deviation',
          description: `Execution price deviates ${(f.priceDeviationRatio * 100).toFixed(1)}% from average share cost`,
          impactScore: 0.65,
        });
        totalRisk += 0.25;
      }

      // 4. Unusual transaction type frequency
      if (f.typeFrequencyRatio <= 0.05 && features.length >= 10) {
        factors.push({
          feature: 'rare_type',
          description: `Transaction type "${f.type}" appears atypically in less than 5% of group history`,
          impactScore: 0.4,
        });
        totalRisk += 0.15;
      }

      // 5. Rapid burst / anomalous cadence
      if (f.timeDeltaHours > 0 && f.timeDeltaHours < 0.1 && f.amount > 10000) {
        factors.push({
          feature: 'cadence_burst',
          description: 'High-value transaction occurred in rapid succession (< 6 minutes from prior transaction)',
          impactScore: 0.55,
        });
        totalRisk += 0.2;
      }

      // Normalize score between 0.00 and 1.00
      const anomalyScore = Math.min(1.0, Math.round(totalRisk * 100) / 100);
      const isAnomaly = anomalyScore >= 0.65;

      return {
        transactionId: f.transactionId,
        anomalyScore,
        isAnomaly,
        contributingFactors: factors,
      };
    });
  }
}

export const tabpfnClient = new TabPFNClient();
