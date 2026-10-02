import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import groupService from '../services/group.service';
import { UnauthorizedError } from '../utils/errors';

/**
 * Create a new group.
 * Route: POST /api/groups
 */
export const createGroup = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const group = await groupService.createGroup(req.user.id, req.body);
  res.status(201).json({
    success: true,
    data: { group },
  });
});

/**
 * Get all groups for the current user.
 * Route: GET /api/groups
 */
export const getGroups = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const groups = await groupService.getUserGroups(req.user.id);
  res.status(200).json({
    success: true,
    data: { groups },
  });
});

/**
 * Get single group details.
 * Route: GET /api/groups/:groupId
 */
export const getGroup = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const group = await groupService.getGroupById(req.params.groupId, req.user.id);
  res.status(200).json({
    success: true,
    data: { group },
  });
});

/**
 * Update group details.
 * Route: PATCH /api/groups/:groupId
 */
export const updateGroup = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const group = await groupService.updateGroup(
    req.params.groupId,
    req.user.id,
    req.body
  );
  res.status(200).json({
    success: true,
    data: { group },
  });
});

/**
 * Delete a group.
 * Route: DELETE /api/groups/:groupId
 */
export const deleteGroup = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  await groupService.deleteGroup(req.params.groupId, req.user.id);
  res.status(200).json({
    success: true,
    message: 'Group deleted successfully',
  });
});

/**
 * Get group members.
 * Route: GET /api/groups/:groupId/members
 */
export const getMembers = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const members = await groupService.getGroupMembers(
    req.params.groupId,
    req.user.id
  );
  res.status(200).json({
    success: true,
    data: { members },
  });
});

/**
 * Add a member to a group.
 * Route: POST /api/groups/:groupId/members
 */
export const addMember = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const member = await groupService.addMember(
    req.params.groupId,
    req.user.id,
    req.body
  );
  res.status(201).json({
    success: true,
    data: { member },
  });
});

/**
 * Update a member's role.
 * Route: PATCH /api/groups/:groupId/members/:memberId
 */
export const updateMemberRole = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const member = await groupService.updateMemberRole(
    req.params.groupId,
    req.user.id,
    req.params.memberId,
    req.body.role
  );
  res.status(200).json({
    success: true,
    data: { member },
  });
});

/**
 * Remove a member from the group.
 * Route: DELETE /api/groups/:groupId/members/:memberId
 */
export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  await groupService.removeMember(
    req.params.groupId,
    req.user.id,
    req.params.memberId
  );
  res.status(200).json({
    success: true,
    message: 'Member removed successfully',
  });
});
