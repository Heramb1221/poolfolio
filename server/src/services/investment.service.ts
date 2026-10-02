import { GroupRole, InvestmentStatus } from '@prisma/client';
import prisma from '../config/prisma';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../utils/errors';
import { SafeInvestment } from '../types/investment';
import {
  CreateInvestmentInput,
  GetInvestmentsQuery,
  UpdateInvestmentInput,
} from '../middleware/investment.validation';

/**
 * Valid lifecycle transitions for an Investment:
 * DRAFT  -> OPEN, CANCELLED
 * OPEN   -> LOCKED, CANCELLED
 * LOCKED -> ACTIVE
 * ACTIVE -> SETTLED
 * SETTLED -> (terminal)
 * CANCELLED -> (terminal)
 */
export const VALID_LIFECYCLE_TRANSITIONS: Record<InvestmentStatus, InvestmentStatus[]> = {
  [InvestmentStatus.DRAFT]: [InvestmentStatus.OPEN, InvestmentStatus.CANCELLED],
  [InvestmentStatus.OPEN]: [InvestmentStatus.LOCKED, InvestmentStatus.CANCELLED],
  [InvestmentStatus.LOCKED]: [InvestmentStatus.ACTIVE],
  [InvestmentStatus.ACTIVE]: [InvestmentStatus.SETTLED],
  [InvestmentStatus.SETTLED]: [],
  [InvestmentStatus.CANCELLED]: [],
};

export class InvestmentService {
  /**
   * Helper to verify group membership and return the membership record.
   */
  private async getGroupMembership(groupId: string, userId: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!group) {
      throw new NotFoundError('Group not found');
    }

    const membership = group.members[0];
    if (!membership) {
      throw new ForbiddenError('You do not have access to this group');
    }

    return { group, membership };
  }

  /**
   * Create a new investment within a group.
   * Only LEADER and CO_LEADER can create investments.
   * New investments always start in DRAFT status.
   */
  async createInvestment(
    groupId: string,
    userId: string,
    input: CreateInvestmentInput
  ): Promise<SafeInvestment> {
    const { membership } = await this.getGroupMembership(groupId, userId);

    if (membership.role === GroupRole.MEMBER) {
      throw new ForbiddenError('Only group leaders and co-leaders can create investments');
    }

    const investment = await prisma.investment.create({
      data: {
        groupId,
        name: input.name.trim(),
        symbol: input.symbol.trim().toUpperCase(),
        type: input.type,
        exchange: input.exchange ? input.exchange.trim().toUpperCase() : null,
        broker: input.broker ? input.broker.trim() : null,
        status: InvestmentStatus.DRAFT,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
      },
    });

    return investment;
  }

  /**
   * Get all investments in a group.
   * Accessible to any authenticated member of the group.
   */
  async getGroupInvestments(
    groupId: string,
    userId: string,
    query?: GetInvestmentsQuery
  ): Promise<SafeInvestment[]> {
    await this.getGroupMembership(groupId, userId);

    const whereClause: {
      groupId: string;
      status?: InvestmentStatus;
      type?: CreateInvestmentInput['type'];
      symbol?: { contains: string; mode: 'insensitive' };
    } = { groupId };

    if (query?.status) {
      whereClause.status = query.status;
    }
    if (query?.type) {
      whereClause.type = query.type;
    }
    if (query?.symbol) {
      whereClause.symbol = {
        contains: query.symbol.trim(),
        mode: 'insensitive',
      };
    }

    const investments = await prisma.investment.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            contributions: true,
            transactions: true,
            settlements: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return investments;
  }

  /**
   * Get single investment details.
   * User must be a member of the group owning the investment.
   * Enforces strict cross-group authorization.
   */
  async getInvestmentById(
    investmentId: string,
    userId: string
  ): Promise<SafeInvestment> {
    const investment = await prisma.investment.findUnique({
      where: { id: investmentId },
      include: {
        _count: {
          select: {
            contributions: true,
            transactions: true,
            settlements: true,
          },
        },
      },
    });

    if (!investment) {
      throw new NotFoundError('Investment not found');
    }

    // Verify requesting user is a member of the investment's group
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: investment.groupId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenError('You do not have access to this investment');
    }

    return investment;
  }

  /**
   * Update investment details and/or transition lifecycle status.
   * Only LEADER and CO_LEADER can update investments.
   * Validates legal lifecycle status transitions.
   */
  async updateInvestment(
    investmentId: string,
    userId: string,
    input: UpdateInvestmentInput
  ): Promise<SafeInvestment> {
    const investment = await prisma.investment.findUnique({
      where: { id: investmentId },
    });

    if (!investment) {
      throw new NotFoundError('Investment not found');
    }

    // Verify requesting user is a member of the investment's group
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: investment.groupId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenError('You do not have access to this investment');
    }

    if (membership.role === GroupRole.MEMBER) {
      throw new ForbiddenError('Only group leaders and co-leaders can update investments');
    }

    // Check terminal statuses
    if (
      investment.status === InvestmentStatus.CANCELLED ||
      investment.status === InvestmentStatus.SETTLED
    ) {
      throw new BadRequestError(
        `Cannot modify an investment that is ${investment.status.toLowerCase()}`
      );
    }

    // Validate status transition if status is being updated
    let newStatus: InvestmentStatus = investment.status;
    let startDate = input.startDate !== undefined
      ? (input.startDate ? new Date(input.startDate) : null)
      : investment.startDate;
    let lockDate = input.lockDate !== undefined
      ? (input.lockDate ? new Date(input.lockDate) : null)
      : investment.lockDate;
    let endDate = input.endDate !== undefined
      ? (input.endDate ? new Date(input.endDate) : null)
      : investment.endDate;

    if (input.status && input.status !== investment.status) {
      const allowedTransitions: InvestmentStatus[] = VALID_LIFECYCLE_TRANSITIONS[investment.status];
      if (!allowedTransitions.includes(input.status)) {
        throw new BadRequestError(
          `Invalid status transition from ${investment.status} to ${input.status}`
        );
      }

      newStatus = input.status;

      // Handle transition-specific lifecycle timestamp requirements
      if (newStatus === InvestmentStatus.OPEN && !startDate) {
        startDate = new Date();
      } else if (newStatus === InvestmentStatus.LOCKED) {
        // Record lockDate when entering LOCKED; preserve if already set
        if (!lockDate) {
          lockDate = new Date();
        }
      } else if (newStatus === InvestmentStatus.SETTLED && !endDate) {
        endDate = new Date();
      }
    }

    const updated = await prisma.investment.update({
      where: { id: investmentId },
      data: {
        name: input.name !== undefined ? input.name.trim() : undefined,
        symbol: input.symbol !== undefined ? input.symbol.trim().toUpperCase() : undefined,
        type: input.type !== undefined ? input.type : undefined,
        exchange: input.exchange !== undefined
          ? (input.exchange ? input.exchange.trim().toUpperCase() : null)
          : undefined,
        broker: input.broker !== undefined
          ? (input.broker ? input.broker.trim() : null)
          : undefined,
        status: newStatus,
        startDate,
        lockDate,
        endDate,
      },
      include: {
        _count: {
          select: {
            contributions: true,
            transactions: true,
            settlements: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Delete an eligible investment.
   * Only LEADER and CO_LEADER can delete.
   * Must reject if investment has entered LOCKED, ACTIVE, or SETTLED.
   * Must reject if investment has financial history (contributions, transactions, settlements).
   */
  async deleteInvestment(investmentId: string, userId: string): Promise<void> {
    const investment = await prisma.investment.findUnique({
      where: { id: investmentId },
      include: {
        _count: {
          select: {
            contributions: true,
            transactions: true,
            settlements: true,
          },
        },
      },
    });

    if (!investment) {
      throw new NotFoundError('Investment not found');
    }

    // Verify requesting user is a member of the investment's group
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: investment.groupId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenError('You do not have access to this investment');
    }

    if (membership.role === GroupRole.MEMBER) {
      throw new ForbiddenError('Only group leaders and co-leaders can delete investments');
    }

    // Reject deletion if investment has entered LOCKED, ACTIVE, or SETTLED
    if (
      investment.status === InvestmentStatus.LOCKED ||
      investment.status === InvestmentStatus.ACTIVE ||
      investment.status === InvestmentStatus.SETTLED
    ) {
      throw new BadRequestError(
        `Cannot delete an investment that is ${investment.status.toLowerCase()}`
      );
    }

    // Reject deletion if financial records exist
    if (
      investment._count.contributions > 0 ||
      investment._count.transactions > 0 ||
      investment._count.settlements > 0
    ) {
      throw new BadRequestError(
        'Cannot delete an investment with existing financial records'
      );
    }

    await prisma.investment.delete({
      where: { id: investmentId },
    });
  }
}

export default new InvestmentService();
