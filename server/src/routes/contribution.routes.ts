import { Router } from 'express';
import {
  createContribution,
  getContributions,
  getContribution,
  updateContribution,
  deleteContribution,
} from '../controllers/contribution.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { investmentIdParamSchema } from '../middleware/investment.validation';
import {
  contributionParamSchema,
  createContributionSchema,
  updateContributionSchema,
  getContributionsQuerySchema,
} from '../middleware/contribution.validation';

const router = Router({ mergeParams: true });

// All contribution endpoints require authentication
router.use(authenticate);

// Contribution collection operations
router.post(
  '/',
  validateRequest({
    params: investmentIdParamSchema,
    body: createContributionSchema,
  }),
  createContribution
);

router.get(
  '/',
  validateRequest({
    params: investmentIdParamSchema,
    query: getContributionsQuerySchema,
  }),
  getContributions
);

// Specific contribution item operations
router.get(
  '/:contributionId',
  validateRequest({ params: contributionParamSchema }),
  getContribution
);

router.patch(
  '/:contributionId',
  validateRequest({
    params: contributionParamSchema,
    body: updateContributionSchema,
  }),
  updateContribution
);

router.delete(
  '/:contributionId',
  validateRequest({ params: contributionParamSchema }),
  deleteContribution
);

export default router;
