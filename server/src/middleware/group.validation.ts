import { z } from 'zod';
import { GroupRole } from '@prisma/client';

export const createGroupSchema = z.object({
  name: z
    .string({ required_error: 'Group name is required' })
    .trim()
    .min(2, 'Group name must be at least 2 characters')
    .max(100, 'Group name cannot exceed 100 characters'),
});

export const updateGroupSchema = z.object({
  name: z
    .string({ required_error: 'Group name is required' })
    .trim()
    .min(2, 'Group name must be at least 2 characters')
    .max(100, 'Group name cannot exceed 100 characters'),
});

export const groupIdParamSchema = z.object({
  groupId: z
    .string({ required_error: 'Group ID is required' })
    .uuid('Invalid group ID format'),
});

export const memberParamSchema = z.object({
  groupId: z
    .string({ required_error: 'Group ID is required' })
    .uuid('Invalid group ID format'),
  memberId: z
    .string({ required_error: 'Member ID is required' })
    .uuid('Invalid member ID format'),
});

export const addMemberSchema = z
  .object({
    userId: z.string().uuid('Invalid user ID format').optional(),
    email: z.string().email('Invalid email address').optional(),
    role: z.nativeEnum(GroupRole, {
      errorMap: () => ({ message: 'Invalid group role' }),
    }).optional(),
  })
  .refine((data) => !!(data.userId || data.email), {
    message: 'Either userId or email must be provided to add a member',
  });

export const updateMemberRoleSchema = z.object({
  role: z.nativeEnum(GroupRole, {
    errorMap: () => ({ message: 'Invalid group role' }),
  }),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
