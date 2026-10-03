import { z } from 'zod';
import { TransactionType } from '@prisma/client';

const decimalRegex = /^\d+(\.\d{1,4})?$/;

const decimalStringValidator = z
  .string({ required_error: 'Amount is required' })
  .trim()
  .refine(
    (val) => decimalRegex.test(val) && Number(val) > 0,
    'Amount must be a positive decimal number with up to 4 decimal places'
  );

const optionalDecimalStringValidator = z
  .string()
  .trim()
  .refine(
    (val) => decimalRegex.test(val) && Number(val) > 0,
    'Must be a positive decimal number with up to 4 decimal places'
  )
  .optional();

export const createTransactionSchema = z
  .object({
    type: z.nativeEnum(TransactionType, {
      errorMap: (issue) => ({
        message:
          issue.code === 'invalid_type' && issue.received === 'undefined'
            ? 'Transaction type is required'
            : 'Valid transaction types: CONTRIBUTION, WITHDRAWAL, BUY, SELL, ALLOTMENT, REFUND, DIVIDEND, FEE, TAX, ADJUSTMENT',
      }),
    }),
    amount: decimalStringValidator,
    quantity: optionalDecimalStringValidator,
    price: optionalDecimalStringValidator,
    transactionDate: z
      .string()
      .datetime({ message: 'Invalid ISO date string for transactionDate' })
      .optional(),
    reference: z
      .string()
      .trim()
      .max(100, 'Reference cannot exceed 100 characters')
      .optional(),
    notes: z
      .string()
      .trim()
      .max(1000, 'Notes cannot exceed 1000 characters')
      .optional(),
    userId: z
      .string()
      .uuid('Invalid user ID format')
      .optional(),
  })
  .strict();

export const updateTransactionSchema = z
  .object({
    reference: z
      .string()
      .trim()
      .max(100, 'Reference cannot exceed 100 characters')
      .optional(),
    notes: z
      .string()
      .trim()
      .max(1000, 'Notes cannot exceed 1000 characters')
      .optional(),
    transactionDate: z
      .string()
      .datetime({ message: 'Invalid ISO date string for transactionDate' })
      .optional(),
  })
  .strict();

export const getTransactionsQuerySchema = z
  .object({
    type: z.nativeEnum(TransactionType).optional(),
    userId: z.string().uuid().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  })
  .strict();

export const transactionIdParamSchema = z
  .object({
    investmentId: z.string().uuid('Invalid investment ID format'),
    transactionId: z.string().uuid('Invalid transaction ID format'),
  })
  .strict();

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type GetTransactionsQuery = z.infer<typeof getTransactionsQuerySchema>;
