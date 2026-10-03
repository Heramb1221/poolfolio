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
import transactionRoutes from './transaction.routes';
import accountingRoutes from './accounting.routes';
import { reportController } from '../modules/reports';

const router = Router();

// All investment endpoints require authentication
router.use(authenticate);

// Report download endpoint (PDF)
router.get(
  '/:investmentId/report',
  validateRequest({ params: investmentIdParamSchema }),
  (req, res, next) => reportController.getInvestmentReport(req, res, next)
);

// Contribution subroutes
router.use('/:investmentId/contributions', contributionRoutes);

// Transaction subroutes
router.use('/:investmentId/transactions', transactionRoutes);

// Accounting endpoints (summary, ownership, pnl, settlements, settle)
router.use('/', accountingRoutes);

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
