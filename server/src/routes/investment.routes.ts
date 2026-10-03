import { Router } from 'express';
import {
  getInvestment,
  updateInvestment,
  deleteInvestment,
} from '../controllers/investment.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import {
  investmentIdParamSchema,
  updateInvestmentSchema,
} from '../middleware/investment.validation';
import contributionRoutes from './contribution.routes';

const router = Router();

// All investment endpoints require authentication
router.use(authenticate);

// Contribution subroutes
router.use('/:investmentId/contributions', contributionRoutes);

// Investment operations
router.get(
  '/:investmentId',
  validateRequest({ params: investmentIdParamSchema }),
  getInvestment
);

router.patch(
  '/:investmentId',
  validateRequest({
    params: investmentIdParamSchema,
    body: updateInvestmentSchema,
  }),
  updateInvestment
);

router.delete(
  '/:investmentId',
  validateRequest({ params: investmentIdParamSchema }),
  deleteInvestment
);

export default router;
