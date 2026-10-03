export type GroupRole = 'LEADER' | 'CO_LEADER' | 'MEMBER';

export type InvestmentType = 'STOCK' | 'IPO';

export type InvestmentStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'LOCKED'
  | 'ACTIVE'
  | 'SETTLED'
  | 'CANCELLED';

export type TransactionType =
  | 'CONTRIBUTION'
  | 'WITHDRAWAL'
  | 'BUY'
  | 'SELL'
  | 'ALLOTMENT'
  | 'REFUND'
  | 'DIVIDEND'
  | 'FEE'
  | 'TAX'
  | 'ADJUSTMENT';

export type SettlementStatus = 'PENDING' | 'SETTLED';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: GroupRole;
  joinedAt: string;
  user?: User;
}

export interface Group {
  id: string;
  name: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  members?: GroupMember[];
  createdBy?: User;
  _count?: {
    members: number;
    investments: number;
  };
}

export interface Investment {
  id: string;
  groupId: string;
  name: string;
  symbol: string;
  type: InvestmentType;
  exchange: string | null;
  broker: string | null;
  status: InvestmentStatus;
  startDate: string | null;
  lockDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    contributions: number;
    transactions: number;
    settlements: number;
  };
}

export interface Contribution {
  id: string;
  investmentId: string;
  userId: string;
  amount: string;
  contributedAt: string;
  notes: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ContributionSummary {
  contributions: Contribution[];
  totalAmount: string;
  contributorCount: number;
  memberBreakdown: Array<{
    userId: string;
    userName: string;
    totalAmount: string;
    contributionCount: number;
  }>;
}

export interface Transaction {
  id: string;
  investmentId: string;
  userId: string | null;
  type: TransactionType;
  quantity: string | null;
  price: string | null;
  amount: string;
  transactionDate: string;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface TransactionSummary {
  transactions: Transaction[];
  totalCount: number;
  typeTotals: Record<
    string,
    {
      count: number;
      totalAmount: string;
    }
  >;
}

export interface MemberOwnership {
  userId: string;
  userName: string;
  email?: string;
  lockedContribution: string;
  ownershipRatio: string;
  ownershipPercentage: string;
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
  settledAt: string | null;
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
    startDate: string | null;
    lockDate: string | null;
    endDate: string | null;
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

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data: T;
  message?: string;
}
