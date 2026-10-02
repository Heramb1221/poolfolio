import { z } from 'zod';
import { InvestmentStatus, InvestmentType } from '@prisma/client';

export const investmentIdParamSchema = z.object({
  investmentId: z
    .string({ required_error: 'Investment ID is required' })
    .uuid('Invalid investment ID format'),
});

export const groupIdParamSchema = z.object({
  groupId: z
    .string({ required_error: 'Group ID is required' })
    .uuid('Invalid group ID format'),
});

export const createInvestmentSchema = z.object({
  name: z
    .string({ required_error: 'Investment name is required' })
    .trim()
    .min(1, 'Investment name must be at least 1 character')
    .max(100, 'Investment name cannot exceed 100 characters'),
  symbol: z
    .string({ required_error: 'Investment symbol is required' })
    .trim()
    .min(1, 'Symbol must be at least 1 character')
    .max(20, 'Symbol cannot exceed 20 characters')
    .transform((val) => val.toUpperCase()),
  type: z.nativeEnum(InvestmentType, {
    errorMap: () => ({ message: 'Investment type must be either STOCK or IPO' }),
  }),
  exchange: z
    .string()
    .trim()
    .max(20, 'Exchange cannot exceed 20 characters')
    .optional()
    .nullable(),
  broker: z
    .string()
    .trim()
    .max(50, 'Broker cannot exceed 50 characters')
    .optional()
    .nullable(),
  startDate: z
    .string()
    .datetime({ message: 'Invalid start date format' })
    .optional()
    .nullable(),
  endDate: z
    .string()
    .datetime({ message: 'Invalid end date format' })
    .optional()
    .nullable(),
});

export const updateInvestmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Investment name must be at least 1 character')
    .max(100, 'Investment name cannot exceed 100 characters')
    .optional(),
  symbol: z
    .string()
    .trim()
    .min(1, 'Symbol must be at least 1 character')
    .max(20, 'Symbol cannot exceed 20 characters')
    .transform((val) => val.toUpperCase())
    .optional(),
  type: z
    .nativeEnum(InvestmentType, {
      errorMap: () => ({ message: 'Investment type must be either STOCK or IPO' }),
    })
    .optional(),
  exchange: z
    .string()
    .trim()
    .max(20, 'Exchange cannot exceed 20 characters')
    .optional()
    .nullable(),
  broker: z
    .string()
    .trim()
    .max(50, 'Broker cannot exceed 50 characters')
    .optional()
    .nullable(),
  status: z
    .nativeEnum(InvestmentStatus, {
      errorMap: () => ({ message: 'Invalid investment status' }),
    })
    .optional(),
  startDate: z
    .string()
    .datetime({ message: 'Invalid start date format' })
    .optional()
    .nullable(),
  lockDate: z
    .string()
    .datetime({ message: 'Invalid lock date format' })
    .optional()
    .nullable(),
  endDate: z
    .string()
    .datetime({ message: 'Invalid end date format' })
    .optional()
    .nullable(),
});

export const getInvestmentsQuerySchema = z.object({
  status: z
    .nativeEnum(InvestmentStatus, {
      errorMap: () => ({ message: 'Invalid investment status filter' }),
    })
    .optional(),
  type: z
    .nativeEnum(InvestmentType, {
      errorMap: () => ({ message: 'Invalid investment type filter' }),
    })
    .optional(),
  symbol: z.string().trim().optional(),
});

export type CreateInvestmentInput = z.infer<typeof createInvestmentSchema>;
export type UpdateInvestmentInput = z.infer<typeof updateInvestmentSchema>;
export type GetInvestmentsQuery = z.infer<typeof getInvestmentsQuerySchema>;
