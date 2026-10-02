import { InvestmentStatus, InvestmentType } from '@prisma/client';

export interface SafeInvestment {
  id: string;
  groupId: string;
  name: string;
  symbol: string;
  type: InvestmentType;
  exchange: string | null;
  broker: string | null;
  status: InvestmentStatus;
  startDate: Date | null;
  lockDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    contributions: number;
    transactions: number;
    settlements: number;
  };
}
