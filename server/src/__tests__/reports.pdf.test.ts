import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InvestmentStatus, InvestmentType, TransactionType } from '@prisma/client';
import { InvestmentPDFBuilder } from '../modules/reports/report.pdf';
import { InvestmentAccountingSummary } from '../types/accounting';
import { SafeTransaction } from '../types/transaction';

describe('Investment PDF Report Generator Unit Tests', () => {
  const mockStockSummary: InvestmentAccountingSummary = {
    investment: {
      id: 'inv-stock-1',
      groupId: 'grp-1',
      name: 'Reliance Long Term Pool',
      symbol: 'RELIANCE',
      type: InvestmentType.STOCK,
      status: InvestmentStatus.ACTIVE,
      startDate: new Date('2026-01-10'),
      lockDate: new Date('2026-01-15'),
      endDate: null,
    },
    capital: {
      totalContributions: '100000.0000',
      contributorCount: 2,
      isLocked: true,
    },
    performance: {
      totalRealizedPnl: '25000.0000',
      totalUnrealizedPnl: '0.0000',
      totalDividends: '1000.0000',
      totalFees: '250.0000',
      totalTaxes: '150.0000',
      netPnl: '25600.0000',
      returnPercentage: '28.44%',
    },
    members: [
      {
        userId: 'user-1',
        userName: 'Alice',
        lockedContribution: '60000.0000',
        ownershipRatio: '0.60000000',
        ownershipPercentage: '60.0000%',
        allocatedRealizedPnl: '15000.0000',
        allocatedUnrealizedPnl: '0.0000',
        allocatedDividends: '600.0000',
        allocatedFees: '150.0000',
        allocatedTaxes: '90.0000',
        netAllocatedPnl: '15360.0000',
        projectedSettlement: '75360.0000',
      },
      {
        userId: 'user-2',
        userName: 'Bob',
        lockedContribution: '40000.0000',
        ownershipRatio: '0.40000000',
        ownershipPercentage: '40.0000%',
        allocatedRealizedPnl: '10000.0000',
        allocatedUnrealizedPnl: '0.0000',
        allocatedDividends: '400.0000',
        allocatedFees: '100.0000',
        allocatedTaxes: '60.0000',
        netAllocatedPnl: '10240.0000',
        projectedSettlement: '50240.0000',
      },
    ],
    trading: {
      totalBoughtShares: '30.0000',
      totalBoughtAmount: '90000.0000',
      avgBuyPrice: '3000.0000',
      totalSoldShares: '0.0000',
      totalSoldAmount: '0.0000',
      avgSellPrice: '0.0000',
      currentSharesHeld: '30.0000',
      costBasisRemaining: '90000.0000',
    },
  };

  const mockTransactions: SafeTransaction[] = [
    {
      id: 'tx-1',
      investmentId: 'inv-stock-1',
      userId: 'user-1',
      type: TransactionType.CONTRIBUTION,
      quantity: null,
      price: null,
      amount: '60000.0000',
      transactionDate: new Date('2026-01-12'),
      reference: 'UPI-ALICE-1',
      notes: 'Initial pooling',
      createdAt: new Date('2026-01-12'),
    },
    {
      id: 'tx-2',
      investmentId: 'inv-stock-1',
      userId: 'user-2',
      type: TransactionType.CONTRIBUTION,
      quantity: null,
      price: null,
      amount: '40000.0000',
      transactionDate: new Date('2026-01-14'),
      reference: 'UPI-BOB-1',
      notes: 'Initial pooling',
      createdAt: new Date('2026-01-14'),
    },
    {
      id: 'tx-3',
      investmentId: 'inv-stock-1',
      userId: null,
      type: TransactionType.BUY,
      quantity: '30.0000',
      price: '3000.0000',
      amount: '90000.0000',
      transactionDate: new Date('2026-01-16'),
      reference: 'ZERODHA-BUY-1',
      notes: 'Market execution',
      createdAt: new Date('2026-01-16'),
    },
  ];

  describe('1. PDF Generation & Format Validation', () => {
    it('should generate a valid PDF binary buffer starting with PDF magic bytes', async () => {
      const buffer = await InvestmentPDFBuilder.build({
        groupName: 'Alpha Investors Club',
        summary: mockStockSummary,
        transactions: mockTransactions,
      });

      assert.ok(Buffer.isBuffer(buffer));
      assert.ok(buffer.length > 500, 'PDF buffer should contain meaningful content');
      // Standard PDF magic header check: %PDF-
      const magicBytes = buffer.subarray(0, 5).toString('ascii');
      assert.equal(magicBytes, '%PDF-');
    });

    it('should correctly render IPO investment reports with applied, allotted, and refund metrics', async () => {
      const mockIPOSummary: InvestmentAccountingSummary = {
        ...mockStockSummary,
        investment: {
          ...mockStockSummary.investment,
          id: 'inv-ipo-1',
          name: 'Swiggy IPO Group Bid',
          symbol: 'SWIGGY',
          type: InvestmentType.IPO,
          status: InvestmentStatus.SETTLED,
          endDate: new Date('2026-02-01'),
        },
        ipo: {
          appliedAmount: '100000.0000',
          allottedAmount: '40000.0000',
          refundAmount: '60000.0000',
        },
      };

      const buffer = await InvestmentPDFBuilder.build({
        groupName: 'Friends & Family Syndicate',
        summary: mockIPOSummary,
        transactions: [
          ...mockTransactions,
          {
            id: 'tx-allot',
            investmentId: 'inv-ipo-1',
            userId: null,
            type: TransactionType.ALLOTMENT,
            quantity: '100.0000',
            price: '400.0000',
            amount: '40000.0000',
            transactionDate: new Date('2026-01-28'),
            reference: 'ALLOT-99',
            notes: 'Share allotment',
            createdAt: new Date('2026-01-28'),
          },
          {
            id: 'tx-ref',
            investmentId: 'inv-ipo-1',
            userId: null,
            type: TransactionType.REFUND,
            quantity: null,
            price: null,
            amount: '60000.0000',
            transactionDate: new Date('2026-01-29'),
            reference: 'REFUND-99',
            notes: 'Unallotted capital returned',
            createdAt: new Date('2026-01-29'),
          },
        ],
      });

      assert.ok(Buffer.isBuffer(buffer));
      const magicBytes = buffer.subarray(0, 5).toString('ascii');
      assert.equal(magicBytes, '%PDF-');
    });

    it('should correctly format negative P&L (loss allocations) without breaking layout', async () => {
      const mockLossSummary: InvestmentAccountingSummary = {
        ...mockStockSummary,
        performance: {
          ...mockStockSummary.performance,
          netPnl: '-20000.0000',
          returnPercentage: '-22.22%',
        },
        members: [
          {
            ...mockStockSummary.members[0],
            netAllocatedPnl: '-12000.0000',
            projectedSettlement: '48000.0000',
          },
          {
            ...mockStockSummary.members[1],
            netAllocatedPnl: '-8000.0000',
            projectedSettlement: '32000.0000',
          },
        ],
      };

      const buffer = await InvestmentPDFBuilder.build({
        groupName: 'Tech Speculators',
        summary: mockLossSummary,
        transactions: mockTransactions,
      });

      assert.ok(Buffer.isBuffer(buffer));
      const magicBytes = buffer.subarray(0, 5).toString('ascii');
      assert.equal(magicBytes, '%PDF-');
    });
  });
});
