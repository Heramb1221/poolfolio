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

const router = Router();

// All investment endpoints require authentication
router.use(authenticate);

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
