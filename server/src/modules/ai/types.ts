import { DocumentStatus, DocumentType, ExtractionStatus, TransactionType } from '@prisma/client';

export interface ExtractedTransactionItem {
  type: TransactionType;
  symbol: string;
  investmentName?: string;
  amount: string; // Exact decimal string
  quantity?: string; // Exact decimal string
  price?: string; // Exact decimal string
  transactionDate?: string; // ISO 8601 or YYYY-MM-DD
  reference?: string;
  notes?: string;
  memberEmail?: string;
  memberName?: string;
  confidence: number; // 0.00 to 1.00
}

export interface AIExtractionOutput {
  documentType: DocumentType;
  broker?: string;
  detectedDate?: string;
  items: ExtractedTransactionItem[];
  summary: string;
  rawNotes?: string;
  overallConfidence: number; // 0.00 to 1.00
}

export interface IGemmaClient {
  extract(
    rawText: string,
    options?: {
      documentType?: DocumentType;
      contextSymbol?: string;
    }
  ): Promise<AIExtractionOutput>;
}

export interface DocumentUploadInput {
  investmentId?: string;
  fileName: string;
  fileUrl?: string;
  content: string; // Raw text or OCR text
  documentType?: DocumentType;
}

