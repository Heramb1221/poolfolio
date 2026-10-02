import { GroupRole } from '@prisma/client';
import { SafeUser } from './auth';

export interface SafeGroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: GroupRole;
  joinedAt: Date;
  user?: SafeUser;
}

export interface SafeGroup {
  id: string;
  name: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  currentUserRole?: GroupRole;
  members?: SafeGroupMember[];
  _count?: {
    members: number;
  };
}
