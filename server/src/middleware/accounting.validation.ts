import { z } from 'zod';

const decimalRegex = /^\d+(\.\d{1,4})?$/;

export const accountingQuerySchema = z
  .object({
    currentPrice: z
      .string()
      .trim()
      .refine(
        (val) => decimalRegex.test(val) && Number(val) >= 0,
        'currentPrice must be a non-negative decimal with up to 4 decimal places'
      )
      .optional(),
  })
  .strict();

export type AccountingQuery = z.infer<typeof accountingQuerySchema>;
