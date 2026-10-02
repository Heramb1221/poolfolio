import { Router } from 'express';
import {
  createGroup,
  getGroups,
  getGroup,
  updateGroup,
  deleteGroup,
  getMembers,
  addMember,
  updateMemberRole,
  removeMember,
} from '../controllers/group.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import {
  createGroupSchema,
  updateGroupSchema,
  groupIdParamSchema,
  memberParamSchema,
  addMemberSchema,
  updateMemberRoleSchema,
} from '../middleware/group.validation';

const router = Router();

// All group and member endpoints require authentication
router.use(authenticate);

// Group management routes
router.post('/', validateRequest({ body: createGroupSchema }), createGroup);
router.get('/', getGroups);
router.get('/:groupId', validateRequest({ params: groupIdParamSchema }), getGroup);
router.patch(
  '/:groupId',
  validateRequest({ params: groupIdParamSchema, body: updateGroupSchema }),
  updateGroup
);
router.delete('/:groupId', validateRequest({ params: groupIdParamSchema }), deleteGroup);

// Group member routes
router.get(
  '/:groupId/members',
  validateRequest({ params: groupIdParamSchema }),
  getMembers
);
router.post(
  '/:groupId/members',
  validateRequest({ params: groupIdParamSchema, body: addMemberSchema }),
  addMember
);
router.patch(
  '/:groupId/members/:memberId',
  validateRequest({ params: memberParamSchema, body: updateMemberRoleSchema }),
  updateMemberRole
);
router.delete(
  '/:groupId/members/:memberId',
  validateRequest({ params: memberParamSchema }),
  removeMember
);

export default router;
