import { Router } from 'express';
import {
  getInvestmentSummary,
  getOwnership,
  getPnL,
  getSettlements,
  settleInvestment,
} from '../controllers/accounting.controller';
import { validateRequest } from '../middleware/validate';
import { investmentIdParamSchema } from '../middleware/investment.validation';
import { accountingQuerySchema } from '../middleware/accounting.validation';

const router = Router({ mergeParams: true });

// GET /api/investments/:investmentId/summary
router.get(
  '/:investmentId/summary',
  validateRequest({
    params: investmentIdParamSchema,
    query: accountingQuerySchema,
  }),
  getInvestmentSummary
);

// GET /api/investments/:investmentId/ownership
router.get(
  '/:investmentId/ownership',
  validateRequest({
    params: investmentIdParamSchema,
  }),
  getOwnership
);

// GET /api/investments/:investmentId/pnl
router.get(
  '/:investmentId/pnl',
  validateRequest({
    params: investmentIdParamSchema,
    query: accountingQuerySchema,
  }),
  getPnL
);

// GET /api/investments/:investmentId/settlements
router.get(
  '/:investmentId/settlements',
  validateRequest({
    params: investmentIdParamSchema,
  }),
  getSettlements
);

// POST /api/investments/:investmentId/settle
router.post(
  '/:investmentId/settle',
  validateRequest({
    params: investmentIdParamSchema,
  }),
  settleInvestment
);

export default router;
