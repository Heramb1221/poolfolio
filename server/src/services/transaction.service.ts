import { GroupRole, InvestmentStatus, Prisma, TransactionType } from '@prisma/client';
import prisma from '../config/prisma';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../utils/errors';
import {
  SafeTransaction,
  TransactionSummary,
} from '../types/transaction';
import {
  CreateTransactionInput,
  GetTransactionsQuery,
  UpdateTransactionInput,
} from '../middleware/transaction.validation';

export class TransactionService {
  /**
   * Format a transaction record with exact decimal string serialization.
   */
  private formatTransaction(t: {
    id: string;
    investmentId: string;
    userId: string | null;
    type: TransactionType;
    quantity: Prisma.Decimal | null;
    price: Prisma.Decimal | null;
    amount: Prisma.Decimal;
    transactionDate: Date;
    reference: string | null;
    notes: string | null;
    createdAt: Date;
    user?: {
      id: string;
      name: string;
      email: string;
    } | null;
  }): SafeTransaction {
    return {
      id: t.id,
      investmentId: t.investmentId,
      userId: t.userId,
      type: t.type,
      quantity: t.quantity ? t.quantity.toFixed(4) : null,
      price: t.price ? t.price.toFixed(4) : null,
      amount: t.amount.toFixed(4),
      transactionDate: t.transactionDate,
      reference: t.reference,
      notes: t.notes,
      createdAt: t.createdAt,
      user: t.user,
    };
  }

  /**
   * Helper to verify investment existence and requester group membership.
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
   * Create a new ledger transaction for an investment.
   * Only LEADER and CO_LEADER can record transactions.
   * Cannot record transactions for investments in DRAFT, CANCELLED, or SETTLED.
   */
  async createTransaction(
    investmentId: string,
    requesterUserId: string,
    input: CreateTransactionInput
  ): Promise<SafeTransaction> {
    const { investment, membership } = await this.getInvestmentWithMembership(
      investmentId,
      requesterUserId
    );

    // Role check: Only LEADER and CO_LEADER
    if (membership.role === GroupRole.MEMBER) {
      throw new ForbiddenError(
        'Only group leaders and co-leaders can record transactions'
      );
    }

    // Lifecycle check
    if (
      investment.status === InvestmentStatus.DRAFT ||
      investment.status === InvestmentStatus.CANCELLED
    ) {
      throw new BadRequestError(
        `Cannot record transactions for an investment in ${investment.status} status`
      );
    }

    if (investment.status === InvestmentStatus.SETTLED) {
      throw new BadRequestError(
        'Cannot record transactions for an investment that is already settled'
      );
    }

    // Target user check if provided
    if (input.userId) {
      const targetMembership = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: investment.groupId,
            userId: input.userId,
          },
        },
      });

      if (!targetMembership) {
        throw new BadRequestError(
          'Target user is not a member of this investment group'
        );
      }
    }

    const amountDecimal = new Prisma.Decimal(input.amount);
    if (amountDecimal.isNegative() || amountDecimal.isZero()) {
      throw new BadRequestError('Transaction amount must be greater than zero');
    }

    const quantityDecimal = input.quantity
      ? new Prisma.Decimal(input.quantity)
      : null;
    if (quantityDecimal && (quantityDecimal.isNegative() || quantityDecimal.isZero())) {
      throw new BadRequestError('Transaction quantity must be greater than zero');
    }

    const priceDecimal = input.price ? new Prisma.Decimal(input.price) : null;
    if (priceDecimal && (priceDecimal.isNegative() || priceDecimal.isZero())) {
      throw new BadRequestError('Transaction price must be greater than zero');
    }

    const transaction = await prisma.transaction.create({
      data: {
        investmentId,
        userId: input.userId || null,
        type: input.type,
        amount: amountDecimal,
        quantity: quantityDecimal,
        price: priceDecimal,
        transactionDate: input.transactionDate
          ? new Date(input.transactionDate)
          : new Date(),
        reference: input.reference ? input.reference.trim() : null,
        notes: input.notes ? input.notes.trim() : null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return this.formatTransaction(transaction);
  }

  /**
   * Retrieve all ledger transactions for an investment.
   * Accessible to all group members.
   * Supports filtering by type, userId, and date range.
   */
  async getInvestmentTransactions(
    investmentId: string,
    requesterUserId: string,
    query?: GetTransactionsQuery
  ): Promise<TransactionSummary> {
    await this.getInvestmentWithMembership(investmentId, requesterUserId);

    const whereClause: {
      investmentId: string;
      type?: TransactionType;
      userId?: string;
      transactionDate?: {
        gte?: Date;
        lte?: Date;
      };
    } = { investmentId };

    if (query?.type) {
      whereClause.type = query.type;
    }
    if (query?.userId) {
      whereClause.userId = query.userId;
    }
    if (query?.startDate || query?.endDate) {
      whereClause.transactionDate = {};
      if (query.startDate) {
        whereClause.transactionDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        whereClause.transactionDate.lte = new Date(query.endDate);
      }
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { transactionDate: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const typeTotals: Record<string, { count: number; totalAmount: string }> = {};

    for (const t of transactions) {
      const existing = typeTotals[t.type] || {
        count: 0,
        totalAmount: '0.0000',
      };
      const newTotal = new Prisma.Decimal(existing.totalAmount).plus(
        new Prisma.Decimal(t.amount)
      );
      typeTotals[t.type] = {
        count: existing.count + 1,
        totalAmount: newTotal.toFixed(4),
      };
    }

    return {
      transactions: transactions.map((t) => this.formatTransaction(t)),
      totalCount: transactions.length,
      typeTotals,
    };
  }

  /**
   * Retrieve a single transaction by ID.
   * Accessible to all group members.
   */
  async getTransactionById(
    investmentId: string,
    transactionId: string,
    requesterUserId: string
  ): Promise<SafeTransaction> {
    await this.getInvestmentWithMembership(investmentId, requesterUserId);

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        investmentId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    return this.formatTransaction(transaction);
  }

  /**
   * Update transaction reference, notes, or transaction date.
   * Only LEADER and CO_LEADER can update.
   * Cannot update if investment is SETTLED.
   */
  async updateTransaction(
    investmentId: string,
    transactionId: string,
    requesterUserId: string,
    input: UpdateTransactionInput
  ): Promise<SafeTransaction> {
    const { investment, membership } = await this.getInvestmentWithMembership(
      investmentId,
      requesterUserId
    );

    if (membership.role === GroupRole.MEMBER) {
      throw new ForbiddenError(
        'Only group leaders and co-leaders can update transactions'
      );
    }

    if (investment.status === InvestmentStatus.SETTLED) {
      throw new BadRequestError(
        'Cannot update transactions on an investment that is already settled'
      );
    }

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        investmentId,
      },
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    const updated = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        reference:
          input.reference !== undefined
            ? input.reference ? input.reference.trim() : null
            : undefined,
        notes:
          input.notes !== undefined
            ? input.notes ? input.notes.trim() : null
            : undefined,
        transactionDate: input.transactionDate
          ? new Date(input.transactionDate)
          : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return this.formatTransaction(updated);
  }
}

export const transactionService = new TransactionService();
export default transactionService;
