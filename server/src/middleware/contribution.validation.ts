import { z } from 'zod';

export const contributionParamSchema = z.object({
  investmentId: z
    .string({ required_error: 'Investment ID is required' })
    .uuid('Invalid investment ID format'),
  contributionId: z
    .string({ required_error: 'Contribution ID is required' })
    .uuid('Invalid contribution ID format'),
});

export const createContributionSchema = z.object({
  amount: z
    .union([z.number(), z.string()])
    .refine(
      (val) => {
        const num = typeof val === 'number' ? val : parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      { message: 'Contribution amount must be a positive number greater than 0' }
    )
    .transform((val) => (typeof val === 'number' ? val.toString() : val.trim())),
  userId: z.string().uuid('Invalid user ID format').optional(),
  contributedAt: z
    .string()
    .datetime({ message: 'Invalid contributedAt date format' })
    .optional(),
  notes: z
    .string()
    .trim()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional()
    .nullable(),
});

export const updateContributionSchema = z
  .object({
    amount: z
      .union([z.number(), z.string()])
      .refine(
        (val) => {
          const num = typeof val === 'number' ? val : parseFloat(val);
          return !isNaN(num) && num > 0;
        },
        { message: 'Contribution amount must be a positive number greater than 0' }
      )
      .transform((val) => (typeof val === 'number' ? val.toString() : val.trim()))
      .optional(),
    notes: z
      .string()
      .trim()
      .max(500, 'Notes cannot exceed 500 characters')
      .optional()
      .nullable(),
  })
  .refine(
    (data) => data.amount !== undefined || data.notes !== undefined,
    { message: 'At least one field (amount or notes) must be provided for update' }
  );

export const getContributionsQuerySchema = z.object({
  userId: z.string().uuid('Invalid user ID format').optional(),
});

export type CreateContributionInput = z.infer<typeof createContributionSchema>;
export type UpdateContributionInput = z.infer<typeof updateContributionSchema>;
export type GetContributionsQuery = z.infer<typeof getContributionsQuerySchema>;
