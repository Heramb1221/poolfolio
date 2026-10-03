import { Router } from 'express';
import {
  createTransaction,
  getInvestmentTransactions,
  getTransactionById,
  updateTransaction,
} from '../controllers/transaction.controller';
import { validateRequest } from '../middleware/validate';
import {
  createTransactionSchema,
  getTransactionsQuerySchema,
  transactionIdParamSchema,
  updateTransactionSchema,
} from '../middleware/transaction.validation';
import { investmentIdParamSchema } from '../middleware/investment.validation';

const router = Router({ mergeParams: true });

// POST /api/investments/:investmentId/transactions
router.post(
  '/',
  validateRequest({
    params: investmentIdParamSchema,
    body: createTransactionSchema,
  }),
  createTransaction
);

// GET /api/investments/:investmentId/transactions
router.get(
  '/',
  validateRequest({
    params: investmentIdParamSchema,
    query: getTransactionsQuerySchema,
  }),
  getInvestmentTransactions
);

// GET /api/investments/:investmentId/transactions/:transactionId
router.get(
  '/:transactionId',
  validateRequest({
    params: transactionIdParamSchema,
  }),
  getTransactionById
);

// PATCH /api/investments/:investmentId/transactions/:transactionId
router.patch(
  '/:transactionId',
  validateRequest({
    params: transactionIdParamSchema,
    body: updateTransactionSchema,
  }),
  updateTransaction
);

export default router;
