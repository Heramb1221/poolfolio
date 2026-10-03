import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DocumentType, TransactionType } from '@prisma/client';
import { DocumentPreprocessor } from '../modules/ai/document.preprocessor';
import { GemmaPromptBuilder } from '../modules/ai/gemma.prompt';
import { GemmaClient } from '../modules/ai/gemma.client';
import {
  aiExtractionOutputSchema,
  confirmExtractionSchema,
  extractedTransactionItemSchema,
} from '../modules/ai/schemas';

describe('Gemma AI Extraction Pipeline Unit Tests', () => {
  describe('1. Document Preprocessor & OCR Boundary', () => {
    it('should sanitize raw OCR text and collapse excessive whitespace', () => {
      const rawText = 'Zerodha   Broking   Ltd.\r\n\r\n\r\nTrade Confirmation   Note\n\n\n\nDate: 2026-03-15';
      const processed = DocumentPreprocessor.preprocess(rawText);

      assert.ok(!processed.sanitizedText.includes('\r'));
      assert.ok(!processed.sanitizedText.includes('\n\n\n'));
      assert.equal(processed.detectedBroker, 'Zerodha');
      assert.equal(processed.detectedType, DocumentType.TRANSACTION_NOTE);
    });

    it('should correctly detect broker names from document content', () => {
      const zerodhaDoc = DocumentPreprocessor.preprocess('CONTRACT NOTE - Zerodha Broking Limited');
      assert.equal(zerodhaDoc.detectedBroker, 'Zerodha');

      const growwDoc = DocumentPreprocessor.preprocess('Billionbrains Garage Services Private Limited (Groww)');
      assert.equal(growwDoc.detectedBroker, 'Groww');

      const iciciDoc = DocumentPreprocessor.preprocess('ICICI Direct Equity Order Confirmation');
      assert.equal(iciciDoc.detectedBroker, 'ICICI Direct');
    });

    it('should correctly classify document types based on financial keywords', () => {
      const ipoDoc = DocumentPreprocessor.preprocess('Basis of Allotment - Tata Technologies IPO Application 84920');
      assert.equal(ipoDoc.detectedType, DocumentType.IPO_ALLOTMENT);

      const contractDoc = DocumentPreprocessor.preprocess('Trade Confirmation / Contract Note for settlement date 2026-02-10');
      assert.equal(contractDoc.detectedType, DocumentType.TRANSACTION_NOTE);

      const statementDoc = DocumentPreprocessor.preprocess('Client Ledger Account Statement from 01/01/2026 to 31/01/2026');
      assert.equal(statementDoc.detectedType, DocumentType.BROKER_STATEMENT);
    });

    it('should extract potential dates, symbols, and amounts to assist the extraction pipeline', () => {
      const doc = DocumentPreprocessor.preprocess(`
        Contract Note: 2026-04-12
        Security: RELIANCE EQ
        Buy Qty: 25 Price: 2850.50 Net Amount: 71262.50
      `);

      assert.ok(doc.metadata.potentialDates.includes('2026-04-12'));
      assert.ok(doc.metadata.potentialSymbols.includes('RELIANCE'));
      assert.ok(doc.metadata.potentialAmounts.some((a) => a.includes('71262.50') || a.includes('2850.50')));
    });
  });

  describe('2. Gemma Prompt Construction', () => {
    it('should format instructions with Gemma turn markers and strict schema', () => {
      const prompt = GemmaPromptBuilder.buildExtractionPrompt({
        sanitizedText: 'BUY 50 TCS @ 3800.00',
        documentType: DocumentType.TRANSACTION_NOTE,
        broker: 'Zerodha',
        contextSymbol: 'TCS',
      });

      assert.ok(prompt.includes('<start_of_turn>user'));
      assert.ok(prompt.includes('<end_of_turn>'));
      assert.ok(prompt.includes('<start_of_turn>model'));
      assert.ok(prompt.includes('Output MUST be ONLY a raw JSON object'));
      assert.ok(prompt.includes('HINT: The target investment symbol is "TCS"'));
      assert.ok(prompt.includes('HINT: The detected broker is "Zerodha"'));
    });
  });

  describe('3. Schema Validation & Safety Boundaries', () => {
    it('should accept valid structured extraction item matching financial ledger rules', () => {
      const validItem = {
        type: TransactionType.BUY,
        symbol: 'INFY',
        investmentName: 'Infosys Limited',
        amount: '18500.0000',
        quantity: '10.0000',
        price: '1850.0000',
        transactionDate: '2026-03-20',
        reference: 'ORD-984210',
        confidence: 0.95,
      };

      const result = extractedTransactionItemSchema.safeParse(validItem);
      assert.equal(result.success, true);
    });

    it('should reject invalid decimal amounts (floating point or negative numbers)', () => {
      const negativeAmount = {
        type: TransactionType.BUY,
        symbol: 'INFY',
        amount: '-1500.00',
      };
      assert.equal(extractedTransactionItemSchema.safeParse(negativeAmount).success, false);

      const invalidDecimals = {
        type: TransactionType.BUY,
        symbol: 'INFY',
        amount: '1500.12345', // 5 decimal places exceeds allowed 4
      };
      assert.equal(extractedTransactionItemSchema.safeParse(invalidDecimals).success, false);
    });

    it('should reject unsupported or arbitrary transaction types', () => {
      const invalidType = {
        type: 'TRANSFER_UNKNOWN',
        symbol: 'INFY',
        amount: '1000.00',
      };
      assert.equal(extractedTransactionItemSchema.safeParse(invalidType).success, false);
    });

    it('should validate full extraction output structure', () => {
      const validOutput = {
        documentType: DocumentType.TRANSACTION_NOTE,
        broker: 'Zerodha',
        detectedDate: '2026-03-20',
        items: [
          {
            type: TransactionType.BUY,
            symbol: 'TATAMOTORS',
            amount: '45000.0000',
            quantity: '50.0000',
            price: '900.0000',
            confidence: 0.92,
          },
        ],
        summary: 'Extracted BUY order for TATAMOTORS',
        overallConfidence: 0.92,
      };

      const result = aiExtractionOutputSchema.safeParse(validOutput);
      assert.equal(result.success, true);
    });

    it('should require at least one extracted item in extraction output', () => {
      const emptyItemsOutput = {
        documentType: DocumentType.TRANSACTION_NOTE,
        broker: 'Zerodha',
        items: [],
        summary: 'No items',
        overallConfidence: 0.1,
      };

      const result = aiExtractionOutputSchema.safeParse(emptyItemsOutput);
      assert.equal(result.success, false);
    });
  });

  describe('4. Gemma Extraction with Mocked Responses', () => {
    it('should parse mocked contract note response into structured JSON', async () => {
      const client = new GemmaClient();

      // Configure mock client
      client.setMockClient({
        extract: async () => ({
          documentType: DocumentType.TRANSACTION_NOTE,
          broker: 'Groww',
          detectedDate: '2026-04-10',
          items: [
            {
              type: TransactionType.BUY,
              symbol: 'HDFCBANK',
              investmentName: 'HDFC Bank Ltd',
              amount: '32000.0000',
              quantity: '20.0000',
              price: '1600.0000',
              transactionDate: '2026-04-10',
              reference: 'CN-849204',
              confidence: 0.94,
            },
          ],
          summary: 'Purchased 20 shares of HDFC Bank at Rs 1,600 each',
          overallConfidence: 0.94,
        }),
      });

      const result = await client.extract('Contract Note text for HDFCBANK');
      assert.equal(result.broker, 'Groww');
      assert.equal(result.items.length, 1);
      assert.equal(result.items[0].symbol, 'HDFCBANK');
      assert.equal(result.items[0].type, TransactionType.BUY);
      assert.equal(result.items[0].amount, '32000.0000');
      assert.equal(result.items[0].quantity, '20.0000');
      assert.equal(result.items[0].price, '1600.0000');
    });

    it('should correctly handle IPO allotment vs refund distinction', async () => {
      const client = new GemmaClient();

      // Mock IPO Allotment response returning both ALLOTMENT and REFUND items
      client.setMockClient({
        extract: async () => ({
          documentType: DocumentType.IPO_ALLOTMENT,
          broker: 'Zerodha',
          detectedDate: '2026-05-02',
          items: [
            {
              type: TransactionType.ALLOTMENT,
              symbol: 'SWIGGY',
              investmentName: 'Swiggy IPO',
              amount: '7800.0000',
              quantity: '20.0000',
              price: '390.0000',
              transactionDate: '2026-05-02',
              reference: 'IPO-APP-921',
              notes: 'Allotted 20 shares',
              confidence: 0.96,
            },
            {
              type: TransactionType.REFUND,
              symbol: 'SWIGGY',
              investmentName: 'Swiggy IPO Refund',
              amount: '7200.0000',
              transactionDate: '2026-05-02',
              reference: 'REF-IPO-APP-921',
              notes: 'Unallotted capital refund',
              confidence: 0.96,
            },
          ],
          summary: 'Swiggy IPO: Applied Rs 15,000; Allotted Rs 7,800; Refunded Rs 7,200',
          overallConfidence: 0.96,
        }),
      });

      const result = await client.extract('IPO Allotment Advice text');
      assert.equal(result.documentType, DocumentType.IPO_ALLOTMENT);
      assert.equal(result.items.length, 2);

      const allotment = result.items.find((i) => i.type === TransactionType.ALLOTMENT);
      const refund = result.items.find((i) => i.type === TransactionType.REFUND);

      assert.ok(allotment, 'ALLOTMENT record must be present');
      assert.ok(refund, 'REFUND record must be present');
      assert.equal(allotment?.amount, '7800.0000');
      assert.equal(refund?.amount, '7200.0000');
    });

    it('should use deterministic fallback extractor when offline / no model endpoint is configured', async () => {
      const client = new GemmaClient();
      client.setMockClient(null); // Clear mock

      const rawNote = `
        Contract Note Zerodha Broking
        Trade Date: 2026-02-18
        Order No: ORD-7721
        Symbol: RELIANCE
        Buy Qty: 15 Price: 2900.00 Net Amount: 43500.00
      `;

      const result = await client.extract(rawNote, {
        documentType: DocumentType.TRANSACTION_NOTE,
        contextSymbol: 'RELIANCE',
      });

      assert.equal(result.broker, 'Zerodha');
      assert.ok(result.items.length >= 1);
      assert.equal(result.items[0].symbol, 'RELIANCE');
      assert.equal(result.items[0].type, TransactionType.BUY);
      assert.equal(result.items[0].amount, '43500.0000');
      assert.equal(result.items[0].quantity, '15.0000');
      assert.equal(result.items[0].price, '2900.0000');
    });
  });

  describe('5. Confirmation Safety Schema', () => {
    it('should validate confirmation payload when leader accepts proposed transaction', () => {
      const payload = {
        investmentId: '3c847e09-f83a-4be2-9844-482a20dbbb8e',
        itemIndex: 0,
        type: TransactionType.BUY,
        amount: '43500.0000',
        quantity: '15.0000',
        price: '2900.0000',
        reference: 'ORD-7721',
        notes: 'Verified Zerodha contract note',
      };

      const result = confirmExtractionSchema.safeParse(payload);
      assert.equal(result.success, true);
    });

    it('should reject confirmation payload if amount is zero or negative', () => {
      const payload = {
        investmentId: '3c847e09-f83a-4be2-9844-482a20dbbb8e',
        type: TransactionType.BUY,
        amount: '0.00',
      };

      const result = confirmExtractionSchema.safeParse(payload);
      assert.equal(result.success, false);
    });
  });
});
