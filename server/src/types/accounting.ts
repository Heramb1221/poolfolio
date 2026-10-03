import { InvestmentStatus, InvestmentType, SettlementStatus } from '@prisma/client';

export interface MemberOwnership {
  userId: string;
  userName: string;
  email?: string;
  lockedContribution: string;
  ownershipRatio: string; // e.g. "0.33333333"
  ownershipPercentage: string; // e.g. "33.3333%"
}

export interface OwnershipResponse {
  investmentId: string;
  investmentStatus: InvestmentStatus;
  isLocked: boolean;
  totalLockedCapital: string;
  contributorCount: number;
  members: MemberOwnership[];
}

export interface MemberPnLAllocation {
  userId: string;
  userName: string;
  email?: string;
  lockedContribution: string;
  ownershipRatio: string;
  ownershipPercentage: string;
  allocatedRealizedPnl: string;
  allocatedUnrealizedPnl: string;
  allocatedDividends: string;
  allocatedFees: string;
  allocatedTaxes: string;
  netAllocatedPnl: string;
  projectedSettlement: string;
}

export interface PnLResponse {
  investmentId: string;
  investmentStatus: InvestmentStatus;
  totalInvested: string;
  currentValue: string;
  totalRealizedPnl: string;
  totalUnrealizedPnl: string;
  totalDividends: string;
  totalFees: string;
  totalTaxes: string;
  netPnl: string;
  returnPercentage: string;
  members: MemberPnLAllocation[];
}

export interface MemberSettlementRecord {
  id?: string;
  userId: string;
  userName: string;
  email?: string;
  investedAmount: string;
  ownershipPercentage: string;
  profitLoss: string;
  finalAmount: string;
  status: SettlementStatus;
  settledAt: Date | null;
}

export interface SettlementsResponse {
  investmentId: string;
  investmentStatus: InvestmentStatus;
  isSettled: boolean;
  totalInvested: string;
  totalProfitLoss: string;
  totalFinalPayout: string;
  settlements: MemberSettlementRecord[];
}

export interface InvestmentAccountingSummary {
  investment: {
    id: string;
    groupId: string;
    name: string;
    symbol: string;
    type: InvestmentType;
    status: InvestmentStatus;
    startDate: Date | null;
    lockDate: Date | null;
    endDate: Date | null;
  };
  capital: {
    totalContributions: string;
    contributorCount: number;
    isLocked: boolean;
  };
  trading: {
    totalBoughtShares: string;
    totalBoughtAmount: string;
    avgBuyPrice: string;
    totalSoldShares: string;
    totalSoldAmount: string;
    avgSellPrice: string;
    currentSharesHeld: string;
    costBasisRemaining: string;
  };
  ipo?: {
    appliedAmount: string;
    allottedAmount: string;
    refundAmount: string;
  };
  performance: {
    totalRealizedPnl: string;
    totalUnrealizedPnl: string;
    totalDividends: string;
    totalFees: string;
    totalTaxes: string;
    netPnl: string;
    returnPercentage: string;
  };
  members: MemberPnLAllocation[];
}
