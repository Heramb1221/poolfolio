import { z } from 'zod';
import { DocumentType, TransactionType } from '@prisma/client';

const decimalRegex = /^\d+(\.\d{1,4})?$/;

const decimalStringValidator = z
  .string()
  .trim()
  .refine(
    (val) => decimalRegex.test(val) && Number(val) > 0,
    'Must be a positive decimal number with up to 4 decimal places'
  );

const optionalDecimalStringValidator = z
  .string()
  .trim()
  .refine(
    (val) => decimalRegex.test(val) && Number(val) > 0,
    'Must be a positive decimal number with up to 4 decimal places'
  )
  .optional();

/**
 * Schema for an individual transaction item extracted by Gemma
 */
export const extractedTransactionItemSchema = z
  .object({
    type: z.nativeEnum(TransactionType, {
      errorMap: () => ({
        message: 'Transaction type must be one of the supported ledger types',
      }),
    }),
    symbol: z
      .string()
      .trim()
      .min(1, 'Symbol is required')
      .max(20, 'Symbol cannot exceed 20 characters')
      .toUpperCase(),
    investmentName: z.string().trim().max(100).optional(),
    amount: decimalStringValidator,
    quantity: optionalDecimalStringValidator,
    price: optionalDecimalStringValidator,
    transactionDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/, 'Invalid date format')
      .optional(),
    reference: z.string().trim().max(100).optional(),
    notes: z.string().trim().max(1000).optional(),
    memberEmail: z.string().email().optional(),
    memberName: z.string().trim().max(100).optional(),
    confidence: z.number().min(0).max(1).default(0.85),
  })
  .strict();

/**
 * Structured schema returned by the Gemma extraction pipeline
 */
export const aiExtractionOutputSchema = z
  .object({
    documentType: z.nativeEnum(DocumentType).default(DocumentType.OTHER),
    broker: z.string().trim().max(100).optional(),
    detectedDate: z.string().trim().optional(),
    items: z.array(extractedTransactionItemSchema).min(1, 'At least one transaction item must be extracted'),
    summary: z.string().trim().min(1, 'Summary description is required'),
    rawNotes: z.string().trim().max(2000).optional(),
    overallConfidence: z.number().min(0).max(1).default(0.85),
  })
  .strict();

/**
 * API request validation for document upload
 */
export const uploadDocumentSchema = z
  .object({
    investmentId: z.string().uuid('Invalid investment ID format').optional(),
    documentType: z.nativeEnum(DocumentType).default(DocumentType.OTHER),
    fileName: z
      .string({ required_error: 'File name is required' })
      .trim()
      .min(1, 'File name cannot be empty')
      .max(255, 'File name cannot exceed 255 characters'),
    content: z
      .string({ required_error: 'Document text content is required' })
      .trim()
      .min(10, 'Document content must contain at least 10 characters')
      .max(100000, 'Document content exceeds maximum allowed length'),
    fileUrl: z.string().trim().url('Invalid URL format').optional(),
  })
  .strict();

/**
 * API request validation for document extraction request
 */
export const extractDocumentSchema = z
  .object({
    contextSymbol: z.string().trim().max(20).optional(),
  })
  .strict();

/**
 * API request validation for confirming an AI extraction into the ledger
 */
export const confirmExtractionSchema = z
  .object({
    investmentId: z.string().uuid('Invalid investment ID format'),
    itemIndex: z.number().int().min(0).optional().default(0),
    type: z.nativeEnum(TransactionType, {
      errorMap: () => ({
        message: 'Valid transaction types: CONTRIBUTION, WITHDRAWAL, BUY, SELL, ALLOTMENT, REFUND, DIVIDEND, FEE, TAX, ADJUSTMENT',
      }),
    }),
    amount: decimalStringValidator,
    quantity: optionalDecimalStringValidator,
    price: optionalDecimalStringValidator,
    transactionDate: z
      .string()
      .datetime({ message: 'Invalid ISO date string for transactionDate' })
      .optional(),
    reference: z.string().trim().max(100).optional(),
    notes: z.string().trim().max(1000).optional(),
    userId: z.string().uuid('Invalid user ID format').optional(),
  })
  .strict();

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type ExtractDocumentInput = z.infer<typeof extractDocumentSchema>;
export type ConfirmExtractionInput = z.infer<typeof confirmExtractionSchema>;
