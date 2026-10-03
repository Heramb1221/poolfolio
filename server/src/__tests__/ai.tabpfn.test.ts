import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma, TransactionType } from '@prisma/client';
import { TabPFNFeatureExtractor } from '../modules/ai/tabpfn.features';
import { TabPFNClient } from '../modules/ai/tabpfn.client';

describe('TabPFN Anomaly Detection Unit Tests', () => {
  // Helper to create synthetic transactions
  const createTx = (params: {
    id: string;
    type: TransactionType;
    amount: number;
    price?: number;
    quantity?: number;
    hoursOffset: number;
    userId?: string;
  }) => ({
    id: params.id,
    type: params.type,
    amount: new Prisma.Decimal(params.amount),
    price: params.price ? new Prisma.Decimal(params.price) : null,
    quantity: params.quantity ? new Prisma.Decimal(params.quantity) : null,
    transactionDate: new Date(Date.now() + params.hoursOffset * 3600 * 1000),
    userId: params.userId || 'user-1',
  });

  describe('1. TabPFN Feature Extraction', () => {
    it('should return empty feature array for empty transaction history', () => {
      const features = TabPFNFeatureExtractor.extractFeatures([], 100000);
      assert.deepEqual(features, []);
    });

    it('should calculate accurate Z-scores, capital ratios, and time deltas across transactions', () => {
      const txs = [
        createTx({ id: 'tx-1', type: TransactionType.BUY, amount: 10000, price: 1000, quantity: 10, hoursOffset: 0 }),
        createTx({ id: 'tx-2', type: TransactionType.BUY, amount: 10000, price: 1000, quantity: 10, hoursOffset: 24 }),
        createTx({ id: 'tx-3', type: TransactionType.BUY, amount: 10000, price: 1000, quantity: 10, hoursOffset: 48 }),
        createTx({ id: 'tx-4', type: TransactionType.BUY, amount: 50000, price: 1000, quantity: 50, hoursOffset: 72 }),
      ];

      const features = TabPFNFeatureExtractor.extractFeatures(txs, 100000);
      assert.equal(features.length, 4);

      // Average amount = (10k + 10k + 10k + 50k) / 4 = 20k
      // tx-4 has amount 50k, should have a positive Z-score > 1.0
      const outlierFeature = features.find((f) => f.transactionId === 'tx-4');
      assert.ok(outlierFeature);
      assert.ok(outlierFeature!.zScoreAmount > 1.0);
      assert.equal(outlierFeature!.ratioToTotalCapital, 0.5); // 50k / 100k
      assert.equal(outlierFeature!.timeDeltaHours, 24); // 24 hours from tx-3
    });
  });

  describe('2. Anomaly Scoring & Pattern Identification', () => {
    it('should assign low anomaly scores to normal, consistent transaction patterns', async () => {
      const client = new TabPFNClient();
      client.setMockClient(null);

      // Normal cluster of consistent transactions
      const txs = [
        createTx({ id: 'tx-1', type: TransactionType.BUY, amount: 5000, price: 100, hoursOffset: 0 }),
        createTx({ id: 'tx-2', type: TransactionType.BUY, amount: 5200, price: 102, hoursOffset: 24 }),
        createTx({ id: 'tx-3', type: TransactionType.BUY, amount: 4800, price: 99, hoursOffset: 48 }),
        createTx({ id: 'tx-4', type: TransactionType.BUY, amount: 5100, price: 101, hoursOffset: 72 }),
        createTx({ id: 'tx-5', type: TransactionType.BUY, amount: 5000, price: 100, hoursOffset: 96 }),
      ];

      const features = TabPFNFeatureExtractor.extractFeatures(txs, 50000);
      const results = await client.predictAnomalies(features);

      assert.equal(results.length, 5);
      for (const r of results) {
        assert.equal(r.isAnomaly, false);
        assert.ok(r.anomalyScore < 0.65, `Anomaly score ${r.anomalyScore} should be below threshold`);
      }
    });

    it('should flag extreme amount outliers and provide explainable contributing factors', async () => {
      const client = new TabPFNClient();
      client.setMockClient(null);

      // Normal series with 1 extreme outlier
      const txs = [
        createTx({ id: 'tx-1', type: TransactionType.BUY, amount: 2000, price: 100, hoursOffset: 0 }),
        createTx({ id: 'tx-2', type: TransactionType.BUY, amount: 2100, price: 100, hoursOffset: 24 }),
        createTx({ id: 'tx-3', type: TransactionType.BUY, amount: 1900, price: 100, hoursOffset: 48 }),
        createTx({ id: 'tx-4', type: TransactionType.BUY, amount: 2050, price: 100, hoursOffset: 72 }),
        createTx({ id: 'tx-outlier', type: TransactionType.BUY, amount: 95000, price: 100, hoursOffset: 96 }),
      ];

      const features = TabPFNFeatureExtractor.extractFeatures(txs, 100000);
      const results = await client.predictAnomalies(features);

      const outlierResult = results.find((r) => r.transactionId === 'tx-outlier');
      assert.ok(outlierResult);
      assert.equal(outlierResult!.isAnomaly, true);
      assert.ok(outlierResult!.anomalyScore >= 0.7);

      // Check explainability
      assert.ok(outlierResult!.contributingFactors.length > 0);
      const hasAmountFactor = outlierResult!.contributingFactors.some(
        (f) => f.feature === 'amount_outlier' || f.feature === 'amount_z_score'
      );
      assert.ok(hasAmountFactor, 'Must explain standard deviation / amount outlier anomaly');
    });

    it('should detect abnormal price deviation in stock executions', async () => {
      const client = new TabPFNClient();
      client.setMockClient(null);

      const txs = [
        createTx({ id: 'tx-1', type: TransactionType.BUY, amount: 10000, price: 100, hoursOffset: 0 }),
        createTx({ id: 'tx-2', type: TransactionType.BUY, amount: 10000, price: 100, hoursOffset: 24 }),
        createTx({ id: 'tx-3', type: TransactionType.BUY, amount: 10000, price: 100, hoursOffset: 48 }),
        // Abnormally inflated execution price (e.g. Rs 250 vs Rs 100 average)
        createTx({ id: 'tx-bad-price', type: TransactionType.BUY, amount: 25000, price: 250, hoursOffset: 72 }),
      ];

      const features = TabPFNFeatureExtractor.extractFeatures(txs, 100000);
      const results = await client.predictAnomalies(features);

      const priceResult = results.find((r) => r.transactionId === 'tx-bad-price');
      assert.ok(priceResult);
      const hasPriceFactor = priceResult!.contributingFactors.some((f) => f.feature === 'price_deviation');
      assert.ok(hasPriceFactor, 'Should identify abnormal price deviation');
    });

    it('should detect abnormal high-value cadence bursts (< 6 minutes)', async () => {
      const client = new TabPFNClient();
      client.setMockClient(null);

      const txs = [
        createTx({ id: 'tx-1', type: TransactionType.BUY, amount: 20000, hoursOffset: 0 }),
        // Sudden second transaction 2 minutes later (0.033 hours)
        createTx({ id: 'tx-burst', type: TransactionType.BUY, amount: 20000, hoursOffset: 0.033 }),
      ];

      const features = TabPFNFeatureExtractor.extractFeatures(txs, 50000);
      const results = await client.predictAnomalies(features);

      const burstResult = results.find((r) => r.transactionId === 'tx-burst');
      assert.ok(burstResult);
      const hasBurstFactor = burstResult!.contributingFactors.some((f) => f.feature === 'cadence_burst');
      assert.ok(hasBurstFactor, 'Should flag rapid cadence burst');
    });
  });

  describe('3. AI Safety & Non-Punitive Output Verification', () => {
    it('should never use derogatory fraud labels in contributing factors', async () => {
      const client = new TabPFNClient();
      client.setMockClient(null);

      const txs = [
        createTx({ id: 'tx-1', type: TransactionType.BUY, amount: 1000, hoursOffset: 0 }),
        createTx({ id: 'tx-2', type: TransactionType.BUY, amount: 1000, hoursOffset: 24 }),
        createTx({ id: 'tx-3', type: TransactionType.BUY, amount: 100000, hoursOffset: 48 }),
      ];

      const features = TabPFNFeatureExtractor.extractFeatures(txs, 100000);
      const results = await client.predictAnomalies(features);

      for (const r of results) {
        for (const factor of r.contributingFactors) {
          assert.ok(
            !factor.description.toLowerCase().includes('fraud'),
            'Contributing factor must not contain word "fraud"'
          );
          assert.ok(
            !factor.description.toLowerCase().includes('scam'),
            'Contributing factor must not contain word "scam"'
          );
          assert.ok(
            !factor.description.toLowerCase().includes('guilty'),
            'Contributing factor must not contain word "guilty"'
          );
        }
      }
    });

    it('should support custom mock client injection for test suites', async () => {
      const client = new TabPFNClient();
      client.setMockClient({
        predictAnomalies: async () => [
          {
            transactionId: 'mock-tx-1',
            anomalyScore: 0.99,
            isAnomaly: true,
            contributingFactors: [
              {
                feature: 'mock_feature',
                description: 'Mocked anomaly trigger',
                impactScore: 1.0,
              },
            ],
          },
        ],
      });

      const res = await client.predictAnomalies([]);
      assert.equal(res.length, 1);
      assert.equal(res[0].transactionId, 'mock-tx-1');
      assert.equal(res[0].anomalyScore, 0.99);
    });
  });
});
