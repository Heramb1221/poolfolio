import { apiClient } from './client';
import {
  AIExtraction,
  ConfirmExtractionInput,
  DocumentRecord,
  InvestmentAnomalyReport,
  UploadDocumentInput,
} from '../types/api';

export const aiApi = {
  /**
   * Upload a broker statement / contract note / IPO notice
   */
  uploadDocument: async (input: UploadDocumentInput): Promise<DocumentRecord> => {
    const res = await apiClient<{ data: DocumentRecord }>('/ai/documents', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  /**
   * Retrieve document details with past extractions
   */
  getDocument: async (documentId: string): Promise<DocumentRecord> => {
    const res = await apiClient<{ data: DocumentRecord }>(`/ai/documents/${documentId}`, {
      method: 'GET',
    });
    return res.data;
  },

  /**
   * Run Gemma extraction on uploaded document
   */
  extractDocument: async (
    documentId: string,
    options?: { contextSymbol?: string }
  ): Promise<AIExtraction> => {
    const res = await apiClient<{ data: AIExtraction }>(
      `/ai/documents/${documentId}/extract`,
      {
        method: 'POST',
        body: JSON.stringify(options || {}),
      }
    );
    return res.data;
  },

  /**
   * Retrieve a single AI extraction
   */
  getExtraction: async (extractionId: string): Promise<AIExtraction> => {
    const res = await apiClient<{ data: AIExtraction }>(`/ai/extractions/${extractionId}`, {
      method: 'GET',
    });
    return res.data;
  },

  /**
   * User confirmation of extracted transaction data:
   * Writes the confirmed transaction into the authoritative financial ledger.
   */
  confirmExtraction: async (
    extractionId: string,
    input: ConfirmExtractionInput
  ): Promise<{ extraction: AIExtraction; transaction: any }> => {
    const res = await apiClient<{ data: { extraction: AIExtraction; transaction: any } }>(
      `/ai/extractions/${extractionId}/confirm`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    );
    return res.data;
  },

  /**
   * Reject proposed AI extraction without altering the ledger
   */
  rejectExtraction: async (extractionId: string): Promise<AIExtraction> => {
    const res = await apiClient<{ data: AIExtraction }>(`/ai/extractions/${extractionId}/reject`, {
      method: 'POST',
    });
    return res.data;
  },

  /**
   * Get latest TabPFN anomaly analysis for an investment
   */
  getAnomalyAnalysis: async (investmentId: string): Promise<InvestmentAnomalyReport> => {
    const res = await apiClient<{ data: InvestmentAnomalyReport }>(
      `/ai/anomaly-analysis/${investmentId}`,
      {
        method: 'GET',
      }
    );
    return res.data;
  },

  /**
   * Trigger TabPFN anomaly analysis on transaction ledger
   */
  runAnomalyAnalysis: async (investmentId: string): Promise<InvestmentAnomalyReport> => {
    const res = await apiClient<{ data: InvestmentAnomalyReport }>(
      `/ai/anomaly-analysis/${investmentId}`,
      {
        method: 'POST',
      }
    );
    return res.data;
  },
};

