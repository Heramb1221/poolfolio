import { GroupRole, InvestmentStatus, Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../utils/errors';
import {
  SafeContribution,
  ContributionSummary,
  MemberContributionBreakdown,
} from '../types/contribution';
import {
  CreateContributionInput,
  GetContributionsQuery,
  UpdateContributionInput,
} from '../middleware/contribution.validation';

export class ContributionService {
  /**
   * Helper to format a Prisma contribution record with exact decimal string serialization.
   */
  private formatContribution(c: {
    id: string;
    investmentId: string;
    userId: string;
    amount: Prisma.Decimal;
    contributedAt: Date;
    notes: string | null;
    createdAt: Date;
    user?: {
      id: string;
      name: string;
      email: string;
    };
  }): SafeContribution {
    return {
      id: c.id,
      investmentId: c.investmentId,
      userId: c.userId,
      amount: c.amount.toFixed(4),
      contributedAt: c.contributedAt,
      notes: c.notes,
      createdAt: c.createdAt,
      user: c.user,
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
   * Create a new contribution for an investment.
   * Can only be created when investment status is OPEN.
   * Members can contribute for themselves.
   * Leaders and Co-Leaders can also record contributions for other group members.
   */
  async createContribution(
    investmentId: string,
    requesterUserId: string,
    input: CreateContributionInput
  ): Promise<SafeContribution> {
    const { investment, membership } = await this.getInvestmentWithMembership(
      investmentId,
      requesterUserId
    );

    // Business rule: contributions are strictly allowed only while OPEN
    if (investment.status !== InvestmentStatus.OPEN) {
      throw new BadRequestError(
        `Contributions can only be made when the investment is in OPEN status (current status: ${investment.status})`
      );
    }

    // Determine target user
    const targetUserId = input.userId || requesterUserId;
    if (targetUserId !== requesterUserId) {
      if (membership.role === GroupRole.MEMBER) {
        throw new ForbiddenError('Members can only create contributions for themselves');
      }

      // Verify target user is a member of this investment group
      const targetMembership = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: investment.groupId,
            userId: targetUserId,
          },
        },
      });

      if (!targetMembership) {
        throw new BadRequestError('Target user is not a member of this investment group');
      }
    }

    // Decimal financial validation
    const decimalAmount = new Prisma.Decimal(input.amount);
    if (decimalAmount.isNegative() || decimalAmount.isZero()) {
      throw new BadRequestError('Contribution amount must be greater than zero');
    }

    const contribution = await prisma.contribution.create({
      data: {
        investmentId,
        userId: targetUserId,
        amount: decimalAmount,
        contributedAt: input.contributedAt
          ? new Date(input.contributedAt)
          : new Date(),
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

    return this.formatContribution(contribution);
  }

  /**
   * Retrieve all contributions for an investment with authoritative totals.
   * All group members can view investment contributions.
   */
  async getInvestmentContributions(
    investmentId: string,
    requesterUserId: string,
    query?: GetContributionsQuery
  ): Promise<ContributionSummary> {
    await this.getInvestmentWithMembership(investmentId, requesterUserId);

    const whereClause: {
      investmentId: string;
      userId?: string;
    } = { investmentId };

    if (query?.userId) {
      whereClause.userId = query.userId;
    }

    const contributions = await prisma.contribution.findMany({
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
        { contributedAt: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    // Authoritative backend accounting calculation using Prisma.Decimal
    let totalAmount = new Prisma.Decimal(0);
    const memberMap = new Map<
      string,
      { userName: string; total: Prisma.Decimal; count: number }
    >();

    for (const c of contributions) {
      const amt = new Prisma.Decimal(c.amount);
      totalAmount = totalAmount.plus(amt);

      const existing = memberMap.get(c.userId) || {
        userName: c.user?.name || 'Unknown',
        total: new Prisma.Decimal(0),
        count: 0,
      };

      existing.total = existing.total.plus(amt);
      existing.count += 1;
      memberMap.set(c.userId, existing);
    }

    const memberBreakdown: MemberContributionBreakdown[] = Array.from(
      memberMap.entries()
    ).map(([userId, val]) => ({
      userId,
      userName: val.userName,
      totalAmount: val.total.toFixed(4),
      contributionCount: val.count,
    }));

    return {
      contributions: contributions.map((c) => this.formatContribution(c)),
      totalAmount: totalAmount.toFixed(4),
      contributorCount: memberMap.size,
      memberBreakdown,
    };
  }

  /**
   * Get single contribution details.
   */
  async getContributionById(
    investmentId: string,
    contributionId: string,
    requesterUserId: string
  ): Promise<SafeContribution> {
    await this.getInvestmentWithMembership(investmentId, requesterUserId);

    const contribution = await prisma.contribution.findFirst({
      where: {
        id: contributionId,
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

    if (!contribution) {
      throw new NotFoundError('Contribution not found');
    }

    return this.formatContribution(contribution);
  }

  /**
   * Update an existing contribution.
   * Can only be updated while investment status is OPEN.
   * Members can only update their own contributions.
   * Leaders and Co-Leaders can update any member contribution in their group.
   */
  async updateContribution(
    investmentId: string,
    contributionId: string,
    requesterUserId: string,
    input: UpdateContributionInput
  ): Promise<SafeContribution> {
    const { investment, membership } = await this.getInvestmentWithMembership(
      investmentId,
      requesterUserId
    );

    const contribution = await prisma.contribution.findFirst({
      where: {
        id: contributionId,
        investmentId,
      },
    });

    if (!contribution) {
      throw new NotFoundError('Contribution not found');
    }

    // Business rule: contributions are immutable once locked or beyond OPEN
    if (investment.status !== InvestmentStatus.OPEN) {
      throw new BadRequestError(
        `Contributions can only be updated when the investment is in OPEN status (current status: ${investment.status})`
      );
    }

    // Role check: members can only update their own contribution
    if (
      membership.role === GroupRole.MEMBER &&
      contribution.userId !== requesterUserId
    ) {
      throw new ForbiddenError('You can only update your own contributions');
    }

    let decimalAmount: Prisma.Decimal | undefined;
    if (input.amount !== undefined) {
      decimalAmount = new Prisma.Decimal(input.amount);
      if (decimalAmount.isNegative() || decimalAmount.isZero()) {
        throw new BadRequestError('Contribution amount must be greater than zero');
      }
    }

    const updated = await prisma.contribution.update({
      where: { id: contributionId },
      data: {
        amount: decimalAmount,
        notes: input.notes !== undefined
          ? (input.notes ? input.notes.trim() : null)
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

    return this.formatContribution(updated);
  }

  /**
   * Delete / cancel an intended contribution.
   * Can only be deleted while investment status is OPEN.
   * Once LOCKED, contribution basis is immutable and cannot be deleted.
   * Members can only delete their own contributions.
   * Leaders and Co-Leaders can delete member contributions while OPEN.
   */
  async deleteContribution(
    investmentId: string,
    contributionId: string,
    requesterUserId: string
  ): Promise<void> {
    const { investment, membership } = await this.getInvestmentWithMembership(
      investmentId,
      requesterUserId
    );

    const contribution = await prisma.contribution.findFirst({
      where: {
        id: contributionId,
        investmentId,
      },
    });

    if (!contribution) {
      throw new NotFoundError('Contribution not found');
    }

    // Business rule: cannot cancel or delete after LOCKED
    if (investment.status !== InvestmentStatus.OPEN) {
      throw new BadRequestError(
        `Contributions can only be cancelled when the investment is in OPEN status (current status: ${investment.status})`
      );
    }

    // Role check: members can only delete their own contribution
    if (
      membership.role === GroupRole.MEMBER &&
      contribution.userId !== requesterUserId
    ) {
      throw new ForbiddenError('You can only delete your own contributions');
    }

    await prisma.contribution.delete({
      where: { id: contributionId },
    });
  }
}

export default new ContributionService();
