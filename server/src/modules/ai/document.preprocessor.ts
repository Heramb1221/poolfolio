import { DocumentType } from '@prisma/client';

export interface PreprocessedDocument {
  sanitizedText: string;
  detectedType: DocumentType;
  detectedBroker?: string;
  metadata: {
    lineCount: number;
    charCount: number;
    potentialDates: string[];
    potentialSymbols: string[];
    potentialAmounts: string[];
  };
}

export class DocumentPreprocessor {
  /**
   * Preprocess raw document text / OCR output:
   * 1. Remove non-printable characters and extra whitespace
   * 2. Detect document type if not specified
   * 3. Extract preliminary patterns (dates, potential amounts, potential symbols)
   */
  public static preprocess(rawContent: string, hintType?: DocumentType): PreprocessedDocument {
    // 1. Sanitize text
    const sanitized = rawContent
      .replace(/[\r\t]+/g, ' ')
      .replace(/[^\x20-\x7E\n]/g, '') // Keep standard printable ASCII + newline
      .replace(/\n\s*\n\s*\n+/g, '\n\n') // Collapse excessive blank lines
      .trim();

    // 2. Identify broker patterns
    let detectedBroker: string | undefined;
    const lower = sanitized.toLowerCase();
    if (lower.includes('zerodha')) {
      detectedBroker = 'Zerodha';
    } else if (lower.includes('groww')) {
      detectedBroker = 'Groww';
    } else if (lower.includes('upstox')) {
      detectedBroker = 'Upstox';
    } else if (lower.includes('hdfc securities') || lower.includes('hdfc sec')) {
      detectedBroker = 'HDFC Securities';
    } else if (lower.includes('icici direct')) {
      detectedBroker = 'ICICI Direct';
    } else if (lower.includes('angel one')) {
      detectedBroker = 'Angel One';
    }

    // 3. Detect document type
    let detectedType = hintType || DocumentType.OTHER;
    if (!hintType || hintType === DocumentType.OTHER) {
      if (
        lower.includes('allotment') ||
        lower.includes('ipo application') ||
        lower.includes('basis of allotment') ||
        lower.includes('shares allotted')
      ) {
        detectedType = DocumentType.IPO_ALLOTMENT;
      } else if (
        lower.includes('contract note') ||
        lower.includes('trade confirmation') ||
        lower.includes('order details') ||
        lower.includes('trade date')
      ) {
        detectedType = DocumentType.TRANSACTION_NOTE;
      } else if (
        lower.includes('statement') ||
        lower.includes('ledger') ||
        lower.includes('account statement') ||
        lower.includes('holdings')
      ) {
        detectedType = DocumentType.BROKER_STATEMENT;
      }
    }

    // 4. Extract preliminary patterns to aid prompt context
    const lines = sanitized.split('\n');
    const dateRegex = /\b(\d{4}-\d{2}-\d{2}|\d{2}[/-]\d{2}[/-]\d{4}|\d{2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b/gi;
    const amountRegex = /(?:₹|rs\.?|inr)\s*\d+(?:,\d+)*(?:\.\d+)?|\b\d{1,3}(?:,\d{2,3})*\.\d{1,4}\b|\b\d+\.\d{1,4}\b/gi;
    const symbolRegex = /\b[A-Z]{2,12}\b/g;

    const potentialDates = Array.from(new Set(sanitized.match(dateRegex) || [])).slice(0, 5);
    const potentialSymbols = Array.from(new Set(sanitized.match(symbolRegex) || []))
      .filter((s) => !['BUY', 'SELL', 'DATE', 'NAME', 'TOTAL', 'NET', 'TAX', 'QTY', 'PRICE', 'IPO', 'PAN', 'NSE', 'BSE'].includes(s))
      .slice(0, 5);
    const rawAmounts = (sanitized.match(amountRegex) || []).map((a) => a.trim());
    const potentialAmounts = Array.from(new Set(rawAmounts)).slice(0, 10);

    return {
      sanitizedText: sanitized,
      detectedType,
      detectedBroker,
      metadata: {
        lineCount: lines.length,
        charCount: sanitized.length,
        potentialDates,
        potentialSymbols,
        potentialAmounts,
      },
    };
  }
}
