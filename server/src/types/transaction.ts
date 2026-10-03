import { TransactionType, Prisma } from '@prisma/client';

export interface SafeTransaction {
  id: string;
  investmentId: string;
  userId: string | null;
  type: TransactionType;
  quantity: string | null;
  price: string | null;
  amount: string;
  transactionDate: Date;
  reference: string | null;
  notes: string | null;
  createdAt: Date;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface TransactionSummary {
  transactions: SafeTransaction[];
  totalCount: number;
  typeTotals: Record<
    string,
    {
      count: number;
      totalAmount: string;
    }
  >;
}
