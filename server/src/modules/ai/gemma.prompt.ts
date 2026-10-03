import { DocumentType } from '@prisma/client';

export class GemmaPromptBuilder {
  /**
   * Build an optimized structured prompt for Gemma to parse financial documents
   * and emit strict JSON without conversational fluff.
   */
  public static buildExtractionPrompt(params: {
    sanitizedText: string;
    documentType: DocumentType;
    broker?: string;
    contextSymbol?: string;
  }): string {
    const { sanitizedText, documentType, broker, contextSymbol } = params;

    return `<start_of_turn>user
You are a specialized financial document parser for an investment pooling ledger called Poolfolio.
Your task is to analyze the document text below and extract structured transaction details.

CRITICAL INSTRUCTIONS:
1. Output MUST be ONLY a raw JSON object. Do NOT include markdown code blocks, do NOT write explanations.
2. Financial numbers must be positive strings with up to 4 decimal places (e.g. "12500.00", "50.0000").
3. Transaction types must be one of:
   - "BUY": stock purchase
   - "SELL": stock sale
   - "ALLOTMENT": IPO shares allotted
   - "REFUND": IPO unallotted refund
   - "DIVIDEND": cash dividend payout
   - "FEE": brokerage or exchange charges
   - "TAX": securities transaction tax or GST
   - "CONTRIBUTION": member capital pooled
4. Dates must be formatted as YYYY-MM-DD if available.
5. In IPO documents, distinguish clearly between "ALLOTMENT" (shares actually received) and "REFUND" (returned funds for unallotted shares).
6. Return the JSON conforming to this schema:
{
  "documentType": "${documentType}",
  "broker": "${broker || 'Unknown'}",
  "detectedDate": "YYYY-MM-DD or null",
  "items": [
    {
      "type": "BUY" | "SELL" | "ALLOTMENT" | "REFUND" | "DIVIDEND" | "FEE" | "TAX",
      "symbol": "STOCK_TICKER",
      "investmentName": "Company Name",
      "amount": "10000.00",
      "quantity": "10.0000",
      "price": "1000.00",
      "transactionDate": "YYYY-MM-DD",
      "reference": "Contract Note or Order ID",
      "notes": "Brief description",
      "confidence": 0.95
    }
  ],
  "summary": "Brief explanation of the extracted transactions",
  "overallConfidence": 0.92
}

${contextSymbol ? `HINT: The target investment symbol is "${contextSymbol}".` : ''}
${broker ? `HINT: The detected broker is "${broker}".` : ''}

DOCUMENT TEXT TO PARSE:
--------------------------------
${sanitizedText}
--------------------------------
<end_of_turn>
<start_of_turn>model
`;
  }
}
