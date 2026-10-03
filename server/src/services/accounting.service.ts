import {
  GroupRole,
  InvestmentStatus,
  InvestmentType,
  Prisma,
  SettlementStatus,
  TransactionType,
} from '@prisma/client';
import prisma from '../config/prisma';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../utils/errors';
import {
  InvestmentAccountingSummary,
  MemberOwnership,
  MemberPnLAllocation,
  MemberSettlementRecord,
  OwnershipResponse,
  PnLResponse,
  SettlementsResponse,
} from '../types/accounting';

export interface ContributorInput {
  userId: string;
  userName: string;
  email?: string;
  amount: Prisma.Decimal;
}

export interface PureOwnershipMember {
  userId: string;
  userName: string;
  email?: string;
  lockedContribution: Prisma.Decimal;
  ownershipRatio: Prisma.Decimal;
  ownershipPercentage: Prisma.Decimal;
}

export interface PureOwnershipResult {
  totalLockedAmount: Prisma.Decimal;
  contributorCount: number;
  members: PureOwnershipMember[];
}

export interface PureStockMetrics {
  totalBoughtShares: Prisma.Decimal;
  totalBoughtAmount: Prisma.Decimal;
  avgBuyPrice: Prisma.Decimal;
  totalSoldShares: Prisma.Decimal;
  totalSoldAmount: Prisma.Decimal;
  avgSellPrice: Prisma.Decimal;
  currentSharesHeld: Prisma.Decimal;
  costBasisRemaining: Prisma.Decimal;
  realizedPnl: Prisma.Decimal;
  unrealizedPnl: Prisma.Decimal;
  totalDividends: Prisma.Decimal;
  totalFees: Prisma.Decimal;
  totalTaxes: Prisma.Decimal;
  netPnl: Prisma.Decimal;
}

export class AccountingService {
  // =========================================================================
  // Pure Accounting Math Engine (No Floating-Point, Decimal Only)
  // =========================================================================

  /**
   * Pure ownership calculation.
   * ownership_percentage = locked_member_contribution / total_locked_contributions
   * Never rounds intermediate values.
   */
  static calculateOwnership(contributors: ContributorInput[]): PureOwnershipResult {
    // Consolidate any multiple contributions per user
    const memberMap = new Map<
      string,
      { userName: string; email?: string; amount: Prisma.Decimal }
    >();

    let totalLockedAmount = new Prisma.Decimal(0);

    for (const c of contributors) {
      totalLockedAmount = totalLockedAmount.plus(c.amount);
      const existing = memberMap.get(c.userId);
      if (existing) {
        existing.amount = existing.amount.plus(c.amount);
      } else {
        memberMap.set(c.userId, {
          userName: c.userName,
          email: c.email,
          amount: new Prisma.Decimal(c.amount),
        });
      }
    }

    const members: PureOwnershipMember[] = [];

    for (const [userId, data] of memberMap.entries()) {
      let ratio = new Prisma.Decimal(0);
      let percentage = new Prisma.Decimal(0);

      if (!totalLockedAmount.isZero()) {
        ratio = data.amount.dividedBy(totalLockedAmount);
        percentage = ratio.times(100);
      }

      members.push({
        userId,
        userName: data.userName,
        email: data.email,
        lockedContribution: data.amount,
        ownershipRatio: ratio,
        ownershipPercentage: percentage,
      });
    }

    return {
      totalLockedAmount,
      contributorCount: memberMap.size,
      members,
    };
  }

  /**
   * Pure stock / ledger event calculation.
   * Tracks BUY, SELL, DIVIDEND, FEE, TAX, ALLOTMENT, REFUND.
   * Computes realized P&L and unrealized P&L if currentPrice is provided.
   */
  static calculateStockMetrics(
    transactions: Array<{
      type: TransactionType;
      quantity: Prisma.Decimal | null;
      price: Prisma.Decimal | null;
      amount: Prisma.Decimal;
    }>,
    currentPrice?: Prisma.Decimal
  ): PureStockMetrics {
    let totalBoughtShares = new Prisma.Decimal(0);
    let totalBoughtAmount = new Prisma.Decimal(0);

    let totalSoldShares = new Prisma.Decimal(0);
    let totalSoldAmount = new Prisma.Decimal(0);

    let totalDividends = new Prisma.Decimal(0);
    let totalFees = new Prisma.Decimal(0);
    let totalTaxes = new Prisma.Decimal(0);

    for (const t of transactions) {
      const amt = new Prisma.Decimal(t.amount);
      const qty = t.quantity ? new Prisma.Decimal(t.quantity) : new Prisma.Decimal(0);

      switch (t.type) {
        case TransactionType.BUY:
        case TransactionType.ALLOTMENT:
          totalBoughtShares = totalBoughtShares.plus(qty);
          totalBoughtAmount = totalBoughtAmount.plus(amt);
          break;

        case TransactionType.SELL:
          totalSoldShares = totalSoldShares.plus(qty);
          totalSoldAmount = totalSoldAmount.plus(amt);
          break;

        case TransactionType.DIVIDEND:
          totalDividends = totalDividends.plus(amt);
          break;

        case TransactionType.FEE:
          totalFees = totalFees.plus(amt);
          break;

        case TransactionType.TAX:
          totalTaxes = totalTaxes.plus(amt);
          break;

        default:
          break;
      }
    }

    const avgBuyPrice = totalBoughtShares.isZero()
      ? new Prisma.Decimal(0)
      : totalBoughtAmount.dividedBy(totalBoughtShares);

    const avgSellPrice = totalSoldShares.isZero()
      ? new Prisma.Decimal(0)
      : totalSoldAmount.dividedBy(totalSoldShares);

    const currentSharesHeld = totalBoughtShares.minus(totalSoldShares);

    // Cost basis of sold shares = soldQuantity * avgBuyPrice
    const costBasisOfSold = totalSoldShares.times(avgBuyPrice);
    const realizedPnl = totalSoldAmount.minus(costBasisOfSold);

    // Cost basis of remaining shares = remainingShares * avgBuyPrice
    const costBasisRemaining = currentSharesHeld.isNegative()
      ? new Prisma.Decimal(0)
      : currentSharesHeld.times(avgBuyPrice);

    let unrealizedPnl = new Prisma.Decimal(0);
    if (currentPrice && !currentSharesHeld.isZero() && !currentSharesHeld.isNegative()) {
      const currentMarketValue = currentSharesHeld.times(currentPrice);
      unrealizedPnl = currentMarketValue.minus(costBasisRemaining);
    }

    const netPnl = realizedPnl
      .plus(unrealizedPnl)
      .plus(totalDividends)
      .minus(totalFees)
      .minus(totalTaxes);

    return {
      totalBoughtShares,
      totalBoughtAmount,
      avgBuyPrice,
      totalSoldShares,
      totalSoldAmount,
      avgSellPrice,
      currentSharesHeld,
      costBasisRemaining,
      realizedPnl,
      unrealizedPnl,
      totalDividends,
      totalFees,
      totalTaxes,
      netPnl,
    };
  }

  /**
   * Pure IPO calculation helper.
   * Tracks applied capital, allotted investment capital basis, and refunded capital.
   */
  static calculateIPOMetrics(
    appliedAmount: Prisma.Decimal,
    allottedAmount: Prisma.Decimal,
    refundAmount: Prisma.Decimal
  ): {
    investedBasis: Prisma.Decimal;
    refunded: Prisma.Decimal;
    unallotted: Prisma.Decimal;
  } {
    const unallotted = appliedAmount.minus(allottedAmount);
    return {
      investedBasis: allottedAmount,
      refunded: refundAmount,
      unallotted,
    };
  }

  /**
   * Pure P&L allocation to members according to their fixed ownership percentage.
   * member_profit_loss = total_profit_loss × ownership_percentage
   * member_settlement = member_locked_contribution + member_profit_loss
   */
  static allocatePnLToMembers(
    ownership: PureOwnershipResult,
    metrics: PureStockMetrics,
    baseCapitalInvested?: Prisma.Decimal
  ): MemberPnLAllocation[] {
    const invested = baseCapitalInvested || ownership.totalLockedAmount;

    return ownership.members.map((m) => {
      const allocatedRealizedPnl = metrics.realizedPnl.times(m.ownershipRatio);
      const allocatedUnrealizedPnl = metrics.unrealizedPnl.times(m.ownershipRatio);
      const allocatedDividends = metrics.totalDividends.times(m.ownershipRatio);
      const allocatedFees = metrics.totalFees.times(m.ownershipRatio);
      const allocatedTaxes = metrics.totalTaxes.times(m.ownershipRatio);
      const netAllocatedPnl = metrics.netPnl.times(m.ownershipRatio);

      const projectedSettlement = m.lockedContribution.plus(netAllocatedPnl);

      return {
        userId: m.userId,
        userName: m.userName,
        email: m.email,
        lockedContribution: m.lockedContribution.toFixed(4),
        ownershipRatio: m.ownershipRatio.toFixed(8),
        ownershipPercentage: `${m.ownershipPercentage.toFixed(4)}%`,
        allocatedRealizedPnl: allocatedRealizedPnl.toFixed(4),
        allocatedUnrealizedPnl: allocatedUnrealizedPnl.toFixed(4),
        allocatedDividends: allocatedDividends.toFixed(4),
        allocatedFees: allocatedFees.toFixed(4),
        allocatedTaxes: allocatedTaxes.toFixed(4),
        netAllocatedPnl: netAllocatedPnl.toFixed(4),
        projectedSettlement: projectedSettlement.toFixed(4),
      };
    });
  }

  // =========================================================================
  // Database-Integrated Accounting Methods
  // =========================================================================

  /**
   * Helper to verify investment existence and membership.
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

    const membership = investment.group.members[0];
    if (!membership) {
      throw new ForbiddenError('You do not have access to this investment');
    }

    return { investment, membership };
  }

  /**
   * Authoritative Ownership Endpoint (`GET /api/investments/:investmentId/ownership`)
   * Ownership is calculated from contributions and becomes permanently fixed at LOCKED.
   */
  async getOwnership(
    investmentId: string,
    requesterUserId: string
  ): Promise<OwnershipResponse> {
    const { investment } = await this.getInvestmentWithMembership(
      investmentId,
      requesterUserId
    );

    const contributions = await prisma.contribution.findMany({
      where: { investmentId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { contributedAt: 'asc' },
    });

    const contributorInputs: ContributorInput[] = contributions.map((c) => ({
      userId: c.userId,
      userName: c.user?.name || 'Unknown',
      email: c.user?.email,
      amount: new Prisma.Decimal(c.amount),
    }));

    const pureResult = AccountingService.calculateOwnership(contributorInputs);

    const isLocked =
      investment.status === InvestmentStatus.LOCKED ||
      investment.status === InvestmentStatus.ACTIVE ||
      investment.status === InvestmentStatus.SETTLED;

    const members: MemberOwnership[] = pureResult.members.map((m) => ({
      userId: m.userId,
      userName: m.userName,
      email: m.email,
      lockedContribution: m.lockedContribution.toFixed(4),
      ownershipRatio: m.ownershipRatio.toFixed(8),
      ownershipPercentage: `${m.ownershipPercentage.toFixed(4)}%`,
    }));

    return {
      investmentId: investment.id,
      investmentStatus: investment.status,
      isLocked,
      totalLockedCapital: pureResult.totalLockedAmount.toFixed(4),
      contributorCount: pureResult.contributorCount,
      members,
    };
  }

  /**
   * Authoritative P&L Endpoint (`GET /api/investments/:investmentId/pnl`)
   * Computes realized P&L, unrealized P&L, dividends, fees, taxes, and allocated shares.
   */
  async getPnL(
    investmentId: string,
    requesterUserId: string,
    currentPriceStr?: string
  ): Promise<PnLResponse> {
    const { investment } = await this.getInvestmentWithMembership(
      investmentId,
      requesterUserId
    );

    // 1. Get contributions
    const contributions = await prisma.contribution.findMany({
      where: { investmentId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const contributorInputs: ContributorInput[] = contributions.map((c) => ({
      userId: c.userId,
      userName: c.user?.name || 'Unknown',
      email: c.user?.email,
      amount: new Prisma.Decimal(c.amount),
    }));

    const ownership = AccountingService.calculateOwnership(contributorInputs);

    // 2. Get transactions
    const transactions = await prisma.transaction.findMany({
      where: { investmentId },
    });

    const currentPrice = currentPriceStr
      ? new Prisma.Decimal(currentPriceStr)
      : undefined;

    const stockMetrics = AccountingService.calculateStockMetrics(
      transactions,
      currentPrice
    );

    const totalInvested = stockMetrics.totalBoughtAmount.isZero()
      ? ownership.totalLockedAmount
      : stockMetrics.totalBoughtAmount;

    let currentValue = stockMetrics.costBasisRemaining;
    if (currentPrice && !stockMetrics.currentSharesHeld.isZero()) {
      currentValue = stockMetrics.currentSharesHeld.times(currentPrice);
    }

    const returnPercentage = totalInvested.isZero()
      ? new Prisma.Decimal(0)
      : stockMetrics.netPnl.dividedBy(totalInvested).times(100);

    const memberAllocations = AccountingService.allocatePnLToMembers(
      ownership,
      stockMetrics,
      totalInvested
    );

    return {
      investmentId: investment.id,
      investmentStatus: investment.status,
      totalInvested: totalInvested.toFixed(4),
      currentValue: currentValue.toFixed(4),
      totalRealizedPnl: stockMetrics.realizedPnl.toFixed(4),
      totalUnrealizedPnl: stockMetrics.unrealizedPnl.toFixed(4),
      totalDividends: stockMetrics.totalDividends.toFixed(4),
      totalFees: stockMetrics.totalFees.toFixed(4),
      totalTaxes: stockMetrics.totalTaxes.toFixed(4),
      netPnl: stockMetrics.netPnl.toFixed(4),
      returnPercentage: `${returnPercentage.toFixed(4)}%`,
      members: memberAllocations,
    };
  }

  /**
   * Authoritative Settlements Endpoint (`GET /api/investments/:investmentId/settlements`)
   * Returns persisted settlements if already SETTLED, or dynamic calculation.
   */
  async getSettlements(
    investmentId: string,
    requesterUserId: string
  ): Promise<SettlementsResponse> {
    const { investment } = await this.getInvestmentWithMembership(
      investmentId,
      requesterUserId
    );

    // Check if settlements are already saved in DB
    const persistedSettlements = await prisma.settlement.findMany({
      where: { investmentId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (persistedSettlements.length > 0) {
      let totalInvested = new Prisma.Decimal(0);
      let totalPnl = new Prisma.Decimal(0);
      let totalPayout = new Prisma.Decimal(0);

      const records: MemberSettlementRecord[] = persistedSettlements.map((s) => {
        const invested = new Prisma.Decimal(s.investedAmount);
        const pnl = new Prisma.Decimal(s.profitLoss);
        const finalAmt = new Prisma.Decimal(s.finalAmount);

        totalInvested = totalInvested.plus(invested);
        totalPnl = totalPnl.plus(pnl);
        totalPayout = totalPayout.plus(finalAmt);

        return {
          id: s.id,
          userId: s.userId,
          userName: s.user?.name || 'Unknown',
          email: s.user?.email,
          investedAmount: invested.toFixed(4),
          ownershipPercentage: `${s.ownershipPercentage.toFixed(4)}%`,
          profitLoss: pnl.toFixed(4),
          finalAmount: finalAmt.toFixed(4),
          status: s.status,
          settledAt: s.settledAt,
        };
      });

      return {
        investmentId: investment.id,
        investmentStatus: investment.status,
        isSettled: investment.status === InvestmentStatus.SETTLED,
        totalInvested: totalInvested.toFixed(4),
        totalProfitLoss: totalPnl.toFixed(4),
        totalFinalPayout: totalPayout.toFixed(4),
        settlements: records,
      };
    }

    // Otherwise calculate dynamically
    const pnlResult = await this.getPnL(investmentId, requesterUserId);

    let totalInvested = new Prisma.Decimal(0);
    let totalPnl = new Prisma.Decimal(0);
    let totalPayout = new Prisma.Decimal(0);

    const dynamicRecords: MemberSettlementRecord[] = pnlResult.members.map((m) => {
      const invested = new Prisma.Decimal(m.lockedContribution);
      const pnl = new Prisma.Decimal(m.netAllocatedPnl);
      const payout = new Prisma.Decimal(m.projectedSettlement);

      totalInvested = totalInvested.plus(invested);
      totalPnl = totalPnl.plus(pnl);
      totalPayout = totalPayout.plus(payout);

      return {
        userId: m.userId,
        userName: m.userName,
        email: m.email,
        investedAmount: invested.toFixed(4),
        ownershipPercentage: m.ownershipPercentage,
        profitLoss: pnl.toFixed(4),
        finalAmount: payout.toFixed(4),
        status: SettlementStatus.PENDING,
        settledAt: null,
      };
    });

    return {
      investmentId: investment.id,
      investmentStatus: investment.status,
      isSettled: false,
      totalInvested: totalInvested.toFixed(4),
      totalProfitLoss: totalPnl.toFixed(4),
      totalFinalPayout: totalPayout.toFixed(4),
      settlements: dynamicRecords,
    };
  }

  /**
   * Settle Investment & Persist Settlement Records (`POST /api/investments/:investmentId/settle`)
   * Transition investment status to SETTLED and record permanent settlement ledger.
   * Only LEADER and CO_LEADER can trigger settlement.
   */
  async settleInvestment(
    investmentId: string,
    requesterUserId: string
  ): Promise<SettlementsResponse> {
    const { investment, membership } = await this.getInvestmentWithMembership(
      investmentId,
      requesterUserId
    );

    if (membership.role === GroupRole.MEMBER) {
      throw new ForbiddenError(
        'Only leaders and co-leaders can settle investments'
      );
    }

    if (investment.status === InvestmentStatus.SETTLED) {
      throw new BadRequestError('Investment is already settled');
    }

    if (investment.status !== InvestmentStatus.ACTIVE) {
      throw new BadRequestError(
        `Investment must be in ACTIVE status before settling (current status: ${investment.status})`
      );
    }

    // Get dynamic calculations
    const pnlResult = await this.getPnL(investmentId, requesterUserId);

    const settledAt = new Date();

    // Use transaction to ensure atomic update of investment and settlement records
    await prisma.$transaction(async (tx) => {
      // 1. Update investment to SETTLED
      await tx.investment.update({
        where: { id: investmentId },
        data: {
          status: InvestmentStatus.SETTLED,
          endDate: settledAt,
        },
      });

      // 2. Insert or update Settlement records
      for (const m of pnlResult.members) {
        const rawOwnership = m.ownershipPercentage.replace('%', '');
        await tx.settlement.upsert({
          where: {
            investmentId_userId: {
              investmentId,
              userId: m.userId,
            },
          },
          create: {
            investmentId,
            userId: m.userId,
            investedAmount: new Prisma.Decimal(m.lockedContribution),
            ownershipPercentage: new Prisma.Decimal(rawOwnership),
            profitLoss: new Prisma.Decimal(m.netAllocatedPnl),
            finalAmount: new Prisma.Decimal(m.projectedSettlement),
            status: SettlementStatus.SETTLED,
            settledAt,
          },
          update: {
            investedAmount: new Prisma.Decimal(m.lockedContribution),
            ownershipPercentage: new Prisma.Decimal(rawOwnership),
            profitLoss: new Prisma.Decimal(m.netAllocatedPnl),
            finalAmount: new Prisma.Decimal(m.projectedSettlement),
            status: SettlementStatus.SETTLED,
            settledAt,
          },
        });
      }
    });

    return this.getSettlements(investmentId, requesterUserId);
  }

  /**
   * Complete Investment Summary Endpoint (`GET /api/investments/:investmentId/summary`)
   */
  async getInvestmentSummary(
    investmentId: string,
    requesterUserId: string,
    currentPriceStr?: string
  ): Promise<InvestmentAccountingSummary> {
    const { investment } = await this.getInvestmentWithMembership(
      investmentId,
      requesterUserId
    );

    const [ownershipRes, pnlRes, transactions] = await Promise.all([
      this.getOwnership(investmentId, requesterUserId),
      this.getPnL(investmentId, requesterUserId, currentPriceStr),
      prisma.transaction.findMany({ where: { investmentId } }),
    ]);

    const currentPrice = currentPriceStr
      ? new Prisma.Decimal(currentPriceStr)
      : undefined;

    const stockMetrics = AccountingService.calculateStockMetrics(
      transactions,
      currentPrice
    );

    let ipoMetrics:
      | { appliedAmount: string; allottedAmount: string; refundAmount: string }
      | undefined;

    if (investment.type === InvestmentType.IPO) {
      let appliedAmt = new Prisma.Decimal(ownershipRes.totalLockedCapital);
      let allottedAmt = stockMetrics.totalBoughtAmount;
      let refundAmt = new Prisma.Decimal(0);

      for (const t of transactions) {
        if (t.type === TransactionType.REFUND) {
          refundAmt = refundAmt.plus(new Prisma.Decimal(t.amount));
        }
      }

      ipoMetrics = {
        appliedAmount: appliedAmt.toFixed(4),
        allottedAmount: allottedAmt.toFixed(4),
        refundAmount: refundAmt.toFixed(4),
      };
    }

    return {
      investment: {
        id: investment.id,
        groupId: investment.groupId,
        name: investment.name,
        symbol: investment.symbol,
        type: investment.type,
        status: investment.status,
        startDate: investment.startDate,
        lockDate: investment.lockDate,
        endDate: investment.endDate,
      },
      capital: {
        totalContributions: ownershipRes.totalLockedCapital,
        contributorCount: ownershipRes.contributorCount,
        isLocked: ownershipRes.isLocked,
      },
      trading: {
        totalBoughtShares: stockMetrics.totalBoughtShares.toFixed(4),
        totalBoughtAmount: stockMetrics.totalBoughtAmount.toFixed(4),
        avgBuyPrice: stockMetrics.avgBuyPrice.toFixed(4),
        totalSoldShares: stockMetrics.totalSoldShares.toFixed(4),
        totalSoldAmount: stockMetrics.totalSoldAmount.toFixed(4),
        avgSellPrice: stockMetrics.avgSellPrice.toFixed(4),
        currentSharesHeld: stockMetrics.currentSharesHeld.toFixed(4),
        costBasisRemaining: stockMetrics.costBasisRemaining.toFixed(4),
      },
      ipo: ipoMetrics,
      performance: {
        totalRealizedPnl: pnlRes.totalRealizedPnl,
        totalUnrealizedPnl: pnlRes.totalUnrealizedPnl,
        totalDividends: pnlRes.totalDividends,
        totalFees: pnlRes.totalFees,
        totalTaxes: pnlRes.totalTaxes,
        netPnl: pnlRes.netPnl,
        returnPercentage: pnlRes.returnPercentage,
      },
      members: pnlRes.members,
    };
  }
}

export const accountingService = new AccountingService();
export default accountingService;
