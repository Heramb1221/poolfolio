import { GroupRole } from '@prisma/client';
import prisma from '../config/prisma';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../utils/errors';
import { SafeGroup, SafeGroupMember } from '../types/group';
import { CreateGroupInput, UpdateGroupInput, AddMemberInput } from '../middleware/group.validation';

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  updatedAt: true,
};

export class GroupService {
  /**
   * Create a new group.
   * Creator automatically becomes the primary LEADER.
   */
  async createGroup(userId: string, input: CreateGroupInput): Promise<SafeGroup> {
    return prisma.$transaction(async (tx) => {
      const group = await tx.group.create({
        data: {
          name: input.name.trim(),
          createdById: userId,
        },
      });

      const leaderMember = await tx.groupMember.create({
        data: {
          groupId: group.id,
          userId,
          role: GroupRole.LEADER,
        },
        include: {
          user: {
            select: safeUserSelect,
          },
        },
      });

      return {
        id: group.id,
        name: group.name,
        createdById: group.createdById,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        currentUserRole: GroupRole.LEADER,
        members: [leaderMember],
        _count: {
          members: 1,
        },
      };
    });
  }

  /**
   * Get all groups the user belongs to.
   * Only returns groups where user has an active membership.
   */
  async getUserGroups(userId: string): Promise<SafeGroup[]> {
    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          where: {
            userId,
          },
          select: {
            role: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      createdById: g.createdById,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
      currentUserRole: g.members[0]?.role,
      _count: {
        members: g._count.members,
      },
    }));
  }

  /**
   * Get single group details by ID.
   * User must be a member of the group.
   */
  async getGroupById(groupId: string, userId: string): Promise<SafeGroup> {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: safeUserSelect,
            },
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundError('Group not found');
    }

    const currentMember = group.members.find((m) => m.userId === userId);
    if (!currentMember) {
      throw new ForbiddenError('You do not have access to this group');
    }

    return {
      id: group.id,
      name: group.name,
      createdById: group.createdById,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      currentUserRole: currentMember.role,
      members: group.members,
      _count: {
        members: group._count.members,
      },
    };
  }

  /**
   * Update group details (e.g. name).
   * Only the group LEADER is authorized.
   */
  async updateGroup(
    groupId: string,
    userId: string,
    input: UpdateGroupInput
  ): Promise<SafeGroup> {
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

    if (membership.role !== GroupRole.LEADER) {
      throw new ForbiddenError('Only the group leader can update group details');
    }

    const updated = await prisma.group.update({
      where: { id: groupId },
      data: {
        name: input.name.trim(),
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      createdById: updated.createdById,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      currentUserRole: GroupRole.LEADER,
    };
  }

  /**
   * Delete a group.
   * Only the group LEADER is authorized.
   */
  async deleteGroup(groupId: string, userId: string): Promise<void> {
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

    if (membership.role !== GroupRole.LEADER) {
      throw new ForbiddenError('Only the group leader can delete the group');
    }

    await prisma.group.delete({
      where: { id: groupId },
    });
  }

  /**
   * Get all members of a group.
   * Requester must be a member of the group.
   */
  async getGroupMembers(groupId: string, userId: string): Promise<SafeGroupMember[]> {
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

    if (group.members.length === 0) {
      throw new ForbiddenError('You do not have access to this group');
    }

    return prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: safeUserSelect,
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });
  }

  /**
   * Add a member to a group.
   * LEADER can add MEMBER or assign CO_LEADER.
   * CO_LEADER can only add routine MEMBER.
   * MEMBER cannot add anyone.
   * Cannot add another LEADER (there must always be exactly one primary leader).
   */
  async addMember(
    groupId: string,
    requesterUserId: string,
    input: AddMemberInput
  ): Promise<SafeGroupMember> {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: { userId: requesterUserId },
        },
      },
    });

    if (!group) {
      throw new NotFoundError('Group not found');
    }

    const requesterMembership = group.members[0];
    if (!requesterMembership) {
      throw new ForbiddenError('You do not have access to this group');
    }

    if (requesterMembership.role === GroupRole.MEMBER) {
      throw new ForbiddenError('Members cannot add other members');
    }

    // Leader and Co-Leader role assignment rules
    if (input.role === GroupRole.LEADER) {
      throw new BadRequestError('Cannot create multiple leaders. A group must have exactly one primary leader');
    }

    if (requesterMembership.role === GroupRole.CO_LEADER && input.role === GroupRole.CO_LEADER) {
      throw new ForbiddenError('Co-leaders cannot assign leadership roles');
    }

    const assignedRole = input.role || GroupRole.MEMBER;

    // Resolve target user
    let targetUser;
    if (input.userId) {
      targetUser = await prisma.user.findUnique({
        where: { id: input.userId },
        select: safeUserSelect,
      });
    } else if (input.email) {
      targetUser = await prisma.user.findUnique({
        where: { email: input.email.toLowerCase() },
        select: safeUserSelect,
      });
    }

    if (!targetUser) {
      throw new NotFoundError('User not found');
    }

    // Check if target user is already in group
    const existingMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: targetUser.id,
        },
      },
    });

    if (existingMembership) {
      throw new ConflictError('User is already a member of this group');
    }

    return prisma.groupMember.create({
      data: {
        groupId,
        userId: targetUser.id,
        role: assignedRole,
      },
      include: {
        user: {
          select: safeUserSelect,
        },
      },
    });
  }

  /**
   * Update a member's role.
   * Only the group LEADER can change roles.
   * Cannot create multiple leaders.
   * Cannot demote or change the existing LEADER.
   */
  async updateMemberRole(
    groupId: string,
    requesterUserId: string,
    memberId: string,
    newRole: GroupRole
  ): Promise<SafeGroupMember> {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: { userId: requesterUserId },
        },
      },
    });

    if (!group) {
      throw new NotFoundError('Group not found');
    }

    const requesterMembership = group.members[0];
    if (!requesterMembership) {
      throw new ForbiddenError('You do not have access to this group');
    }

    if (requesterMembership.role !== GroupRole.LEADER) {
      throw new ForbiddenError('Only the group leader can change member roles');
    }

    const targetMember = await prisma.groupMember.findFirst({
      where: {
        id: memberId,
        groupId,
      },
    });

    if (!targetMember) {
      throw new NotFoundError('Group member not found');
    }

    if (targetMember.role === GroupRole.LEADER) {
      throw new BadRequestError('The group leader role cannot be changed');
    }

    if (newRole === GroupRole.LEADER) {
      throw new BadRequestError('Cannot create multiple leaders. A group must have exactly one primary leader');
    }

    return prisma.groupMember.update({
      where: { id: memberId },
      data: { role: newRole },
      include: {
        user: {
          select: safeUserSelect,
        },
      },
    });
  }

  /**
   * Remove a member from the group.
   * LEADER cannot be removed from the group (neither by themselves nor anyone else).
   * CO_LEADER can only remove regular MEMBER (cannot remove LEADER or other CO_LEADER).
   * MEMBER cannot remove anyone.
   */
  async removeMember(
    groupId: string,
    requesterUserId: string,
    memberId: string
  ): Promise<void> {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: { userId: requesterUserId },
        },
      },
    });

    if (!group) {
      throw new NotFoundError('Group not found');
    }

    const requesterMembership = group.members[0];
    if (!requesterMembership) {
      throw new ForbiddenError('You do not have access to this group');
    }

    const targetMember = await prisma.groupMember.findFirst({
      where: {
        id: memberId,
        groupId,
      },
    });

    if (!targetMember) {
      throw new NotFoundError('Group member not found');
    }

    // Group leader cannot be removed under any circumstances
    if (targetMember.role === GroupRole.LEADER) {
      throw new BadRequestError('The group leader cannot be removed from the group');
    }

    // Role-based permissions
    if (requesterMembership.role === GroupRole.MEMBER) {
      throw new ForbiddenError('Members cannot remove group members');
    }

    if (requesterMembership.role === GroupRole.CO_LEADER) {
      if (targetMember.role === GroupRole.CO_LEADER) {
        throw new ForbiddenError('Co-leaders cannot remove other co-leaders');
      }
    }

    await prisma.groupMember.delete({
      where: { id: memberId },
    });
  }
}

export default new GroupService();
