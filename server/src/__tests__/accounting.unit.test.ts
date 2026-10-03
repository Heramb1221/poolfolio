import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma, TransactionType } from '@prisma/client';
import { AccountingService } from '../services/accounting.service';

describe('Accounting Engine Unit Tests', () => {
  describe('1. Ownership Calculation', () => {
    it('should calculate equal ownership for equal contributions (50% / 50%)', () => {
      const result = AccountingService.calculateOwnership([
        {
          userId: 'user-1',
          userName: 'Alice',
          amount: new Prisma.Decimal('10000.0000'),
        },
        {
          userId: 'user-2',
          userName: 'Bob',
          amount: new Prisma.Decimal('10000.0000'),
        },
      ]);

      assert.equal(result.totalLockedAmount.toFixed(4), '20000.0000');
      assert.equal(result.contributorCount, 2);

      const alice = result.members.find((m) => m.userId === 'user-1')!;
      const bob = result.members.find((m) => m.userId === 'user-2')!;

      assert.equal(alice.ownershipRatio.toFixed(4), '0.5000');
      assert.equal(alice.ownershipPercentage.toFixed(2), '50.00');
      assert.equal(bob.ownershipRatio.toFixed(4), '0.5000');
      assert.equal(bob.ownershipPercentage.toFixed(2), '50.00');

      // Sum of ratios must equal exactly 1
      assert.equal(alice.ownershipRatio.plus(bob.ownershipRatio).toFixed(4), '1.0000');
    });

    it('should calculate unequal ownership correctly (70% / 30% and 3-way split)', () => {
      const result2Way = AccountingService.calculateOwnership([
        {
          userId: 'user-1',
          userName: 'Alice',
          amount: new Prisma.Decimal('7000.0000'),
        },
        {
          userId: 'user-2',
          userName: 'Bob',
          amount: new Prisma.Decimal('3000.0000'),
        },
      ]);

      const alice2 = result2Way.members.find((m) => m.userId === 'user-1')!;
      const bob2 = result2Way.members.find((m) => m.userId === 'user-2')!;

      assert.equal(alice2.ownershipPercentage.toFixed(2), '70.00');
      assert.equal(bob2.ownershipPercentage.toFixed(2), '30.00');

      // 3-way split: 2500, 2500, 5000 (total 10000)
      const result3Way = AccountingService.calculateOwnership([
        {
          userId: 'user-1',
          userName: 'Alice',
          amount: new Prisma.Decimal('2500.0000'),
        },
        {
          userId: 'user-2',
          userName: 'Bob',
          amount: new Prisma.Decimal('2500.0000'),
        },
        {
          userId: 'user-3',
          userName: 'Charlie',
          amount: new Prisma.Decimal('5000.0000'),
        },
      ]);

      assert.equal(result3Way.contributorCount, 3);
      assert.equal(result3Way.totalLockedAmount.toFixed(4), '10000.0000');

      const charlie = result3Way.members.find((m) => m.userId === 'user-3')!;
      assert.equal(charlie.ownershipPercentage.toFixed(2), '50.00');
    });

    it('should consolidate multiple contributions from the same user', () => {
      const result = AccountingService.calculateOwnership([
        {
          userId: 'user-1',
          userName: 'Alice',
          amount: new Prisma.Decimal('3000.0000'),
        },
        {
          userId: 'user-1',
          userName: 'Alice',
          amount: new Prisma.Decimal('2000.0000'),
        },
        {
          userId: 'user-2',
          userName: 'Bob',
          amount: new Prisma.Decimal('5000.0000'),
        },
      ]);

      assert.equal(result.contributorCount, 2);
      assert.equal(result.totalLockedAmount.toFixed(4), '10000.0000');

      const alice = result.members.find((m) => m.userId === 'user-1')!;
      assert.equal(alice.lockedContribution.toFixed(4), '5000.0000');
      assert.equal(alice.ownershipPercentage.toFixed(2), '50.00');
    });

    it('should safely handle zero or empty contributors without division by zero', () => {
      const result = AccountingService.calculateOwnership([]);
      assert.equal(result.totalLockedAmount.toFixed(4), '0.0000');
      assert.equal(result.contributorCount, 0);
      assert.equal(result.members.length, 0);
    });
  });

  describe('2. Profit & Loss Allocation', () => {
    it('should correctly compute and allocate profit by ownership ratio', () => {
      const ownership = AccountingService.calculateOwnership([
        {
          userId: 'user-1',
          userName: 'Alice',
          amount: new Prisma.Decimal('6000.0000'), // 60%
        },
        {
          userId: 'user-2',
          userName: 'Bob',
          amount: new Prisma.Decimal('4000.0000'), // 40%
        },
      ]);

      // Stock bought for 10000 (100 shares @ 100) and sold for 15000 (100 shares @ 150) -> 5000 profit
      const metrics = AccountingService.calculateStockMetrics([
        {
          type: TransactionType.BUY,
          quantity: new Prisma.Decimal('100.0000'),
          price: new Prisma.Decimal('100.0000'),
          amount: new Prisma.Decimal('10000.0000'),
        },
        {
          type: TransactionType.SELL,
          quantity: new Prisma.Decimal('100.0000'),
          price: new Prisma.Decimal('150.0000'),
          amount: new Prisma.Decimal('15000.0000'),
        },
      ]);

      assert.equal(metrics.realizedPnl.toFixed(4), '5000.0000');
      assert.equal(metrics.netPnl.toFixed(4), '5000.0000');

      const allocations = AccountingService.allocatePnLToMembers(ownership, metrics);

      const alice = allocations.find((a) => a.userId === 'user-1')!;
      const bob = allocations.find((a) => a.userId === 'user-2')!;

      // Alice 60% of 5000 = 3000
      assert.equal(alice.allocatedRealizedPnl, '3000.0000');
      assert.equal(alice.netAllocatedPnl, '3000.0000');
      // Alice settlement = 6000 + 3000 = 9000
      assert.equal(alice.projectedSettlement, '9000.0000');

      // Bob 40% of 5000 = 2000
      assert.equal(bob.allocatedRealizedPnl, '2000.0000');
      assert.equal(bob.netAllocatedPnl, '2000.0000');
      // Bob settlement = 4000 + 2000 = 6000
      assert.equal(bob.projectedSettlement, '6000.0000');

      // Total payouts must equal final revenue (9000 + 6000 = 15000)
      const totalPayout = new Prisma.Decimal(alice.projectedSettlement).plus(
        new Prisma.Decimal(bob.projectedSettlement)
      );
      assert.equal(totalPayout.toFixed(4), '15000.0000');
    });

    it('should correctly compute and allocate losses symmetrically', () => {
      const ownership = AccountingService.calculateOwnership([
        {
          userId: 'user-1',
          userName: 'Alice',
          amount: new Prisma.Decimal('5000.0000'), // 50%
        },
        {
          userId: 'user-2',
          userName: 'Bob',
          amount: new Prisma.Decimal('5000.0000'), // 50%
        },
      ]);

      // Stock bought for 10000 and sold for 7000 -> 3000 loss
      const metrics = AccountingService.calculateStockMetrics([
        {
          type: TransactionType.BUY,
          quantity: new Prisma.Decimal('100.0000'),
          price: new Prisma.Decimal('100.0000'),
          amount: new Prisma.Decimal('10000.0000'),
        },
        {
          type: TransactionType.SELL,
          quantity: new Prisma.Decimal('100.0000'),
          price: new Prisma.Decimal('70.0000'),
          amount: new Prisma.Decimal('7000.0000'),
        },
      ]);

      assert.equal(metrics.realizedPnl.toFixed(4), '-3000.0000');
      assert.equal(metrics.netPnl.toFixed(4), '-3000.0000');

      const allocations = AccountingService.allocatePnLToMembers(ownership, metrics);

      const alice = allocations.find((a) => a.userId === 'user-1')!;
      const bob = allocations.find((a) => a.userId === 'user-2')!;

      // 50% of -3000 = -1500
      assert.equal(alice.netAllocatedPnl, '-1500.0000');
      // Alice settlement = 5000 - 1500 = 3500
      assert.equal(alice.projectedSettlement, '3500.0000');

      assert.equal(bob.netAllocatedPnl, '-1500.0000');
      assert.equal(bob.projectedSettlement, '3500.0000');

      // Total payouts must equal final revenue (3500 + 3500 = 7000)
      const totalPayout = new Prisma.Decimal(alice.projectedSettlement).plus(
        new Prisma.Decimal(bob.projectedSettlement)
      );
      assert.equal(totalPayout.toFixed(4), '7000.0000');
    });

    it('should separately account for fees, taxes, and dividends', () => {
      const ownership = AccountingService.calculateOwnership([
        {
          userId: 'user-1',
          userName: 'Alice',
          amount: new Prisma.Decimal('10000.0000'),
        },
      ]);

      const metrics = AccountingService.calculateStockMetrics([
        {
          type: TransactionType.BUY,
          quantity: new Prisma.Decimal('100.0000'),
          price: new Prisma.Decimal('100.0000'),
          amount: new Prisma.Decimal('10000.0000'),
        },
        {
          type: TransactionType.SELL,
          quantity: new Prisma.Decimal('100.0000'),
          price: new Prisma.Decimal('120.0000'),
          amount: new Prisma.Decimal('12000.0000'),
        },
        {
          type: TransactionType.DIVIDEND,
          quantity: null,
          price: null,
          amount: new Prisma.Decimal('500.0000'),
        },
        {
          type: TransactionType.FEE,
          quantity: null,
          price: null,
          amount: new Prisma.Decimal('50.0000'),
        },
        {
          type: TransactionType.TAX,
          quantity: null,
          price: null,
          amount: new Prisma.Decimal('150.0000'),
        },
      ]);

      // Realized P&L from trades = 12000 - 10000 = 2000
      assert.equal(metrics.realizedPnl.toFixed(4), '2000.0000');
      assert.equal(metrics.totalDividends.toFixed(4), '500.0000');
      assert.equal(metrics.totalFees.toFixed(4), '50.0000');
      assert.equal(metrics.totalTaxes.toFixed(4), '150.0000');

      // Net P&L = 2000 + 500 - 50 - 150 = 2300
      assert.equal(metrics.netPnl.toFixed(4), '2300.0000');

      const allocations = AccountingService.allocatePnLToMembers(ownership, metrics);
      assert.equal(allocations[0].netAllocatedPnl, '2300.0000');
      assert.equal(allocations[0].projectedSettlement, '12300.0000');
    });

    it('should compute unrealized P&L correctly when active shares are held', () => {
      // Buy 200 shares @ 50 (10000), sell 50 shares @ 60 (3000)
      // Remaining: 150 shares @ avg 50 (cost basis = 7500)
      // Current market price: 70 -> Market value = 150 * 70 = 10500
      // Unrealized P&L = 10500 - 7500 = 3000
      // Realized P&L = 3000 - (50 * 50) = 500
      const currentPrice = new Prisma.Decimal('70.0000');
      const metrics = AccountingService.calculateStockMetrics(
        [
          {
            type: TransactionType.BUY,
            quantity: new Prisma.Decimal('200.0000'),
            price: new Prisma.Decimal('50.0000'),
            amount: new Prisma.Decimal('10000.0000'),
          },
          {
            type: TransactionType.SELL,
            quantity: new Prisma.Decimal('50.0000'),
            price: new Prisma.Decimal('60.0000'),
            amount: new Prisma.Decimal('3000.0000'),
          },
        ],
        currentPrice
      );

      assert.equal(metrics.totalBoughtShares.toFixed(4), '200.0000');
      assert.equal(metrics.totalSoldShares.toFixed(4), '50.0000');
      assert.equal(metrics.currentSharesHeld.toFixed(4), '150.0000');
      assert.equal(metrics.avgBuyPrice.toFixed(4), '50.0000');
      assert.equal(metrics.costBasisRemaining.toFixed(4), '7500.0000');
      assert.equal(metrics.realizedPnl.toFixed(4), '500.0000');
      assert.equal(metrics.unrealizedPnl.toFixed(4), '3000.0000');
      assert.equal(metrics.netPnl.toFixed(4), '3500.0000');
    });
  });

  describe('3. IPO Allocation & Refund Handling', () => {
    it('should track applied, allotted capital basis, and refund correctly per IPO rule', () => {
      // Per AGENTS.md / docs:
      // Applied: 20000
      // Allotted: 8000
      // Refund: 12000
      // Actual investment capital basis: 8000
      const applied = new Prisma.Decimal('20000.0000');
      const allotted = new Prisma.Decimal('8000.0000');
      const refund = new Prisma.Decimal('12000.0000');

      const ipo = AccountingService.calculateIPOMetrics(applied, allotted, refund);

      assert.equal(ipo.investedBasis.toFixed(4), '8000.0000');
      assert.equal(ipo.refunded.toFixed(4), '12000.0000');
      assert.equal(ipo.unallotted.toFixed(4), '12000.0000');

      // Now if the allotted IPO stock (8000) sells for 14000:
      const metrics = AccountingService.calculateStockMetrics([
        {
          type: TransactionType.ALLOTMENT,
          quantity: new Prisma.Decimal('80.0000'),
          price: new Prisma.Decimal('100.0000'),
          amount: allotted,
        },
        {
          type: TransactionType.SELL,
          quantity: new Prisma.Decimal('80.0000'),
          price: new Prisma.Decimal('175.0000'),
          amount: new Prisma.Decimal('14000.0000'),
        },
      ]);

      // Profit is on allocated basis: 14000 - 8000 = 6000
      assert.equal(metrics.realizedPnl.toFixed(4), '6000.0000');
    });
  });

  describe('4. Decimal Precision and Immutability', () => {
    it('should never suffer from floating-point arithmetic errors', () => {
      // Classic JS float bug: 0.1 + 0.2 !== 0.3
      const d1 = new Prisma.Decimal('0.1000');
      const d2 = new Prisma.Decimal('0.2000');
      const sum = d1.plus(d2);
      assert.equal(sum.toFixed(4), '0.3000');

      // 1 / 3 without intermediate rounding
      const oneThird = new Prisma.Decimal(1).dividedBy(3);
      const timesThree = oneThird.times(3);
      // Prisma Decimal uses Decimal.js high precision (20+ digits)
      assert.equal(timesThree.toFixed(4), '1.0000');
    });
  });
});
