import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiApi } from '../api/ai.api';
import { ConfirmExtractionInput, UploadDocumentInput } from '../types/api';

export const AI_QUERY_KEYS = {
  anomalies: (investmentId: string) => ['ai', 'anomalies', investmentId] as const,
  document: (documentId: string) => ['ai', 'document', documentId] as const,
  extraction: (extractionId: string) => ['ai', 'extraction', extractionId] as const,
};

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UploadDocumentInput) => aiApi.uploadDocument(input),
    onSuccess: (data) => {
      queryClient.setQueryData(AI_QUERY_KEYS.document(data.id), data);
    },
  });
}

export function useExtractDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      documentId,
      contextSymbol,
    }: {
      documentId: string;
      contextSymbol?: string;
    }) => aiApi.extractDocument(documentId, { contextSymbol }),
    onSuccess: (data) => {
      queryClient.setQueryData(AI_QUERY_KEYS.extraction(data.id), data);
    },
  });
}

export function useConfirmExtraction(investmentId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      extractionId,
      input,
    }: {
      extractionId: string;
      input: ConfirmExtractionInput;
    }) => aiApi.confirmExtraction(extractionId, input),
    onSuccess: () => {
      if (investmentId) {
        // Invalidate investment financial queries to reflect the confirmed transaction
        queryClient.invalidateQueries({ queryKey: ['transactions', investmentId] });
        queryClient.invalidateQueries({ queryKey: ['accounting', 'summary', investmentId] });
        queryClient.invalidateQueries({ queryKey: ['accounting', 'pnl', investmentId] });
        queryClient.invalidateQueries({ queryKey: AI_QUERY_KEYS.anomalies(investmentId) });
      }
    },
  });
}

export function useRejectExtraction() {
  return useMutation({
    mutationFn: (extractionId: string) => aiApi.rejectExtraction(extractionId),
  });
}

export function useAnomalyAnalysis(investmentId?: string) {
  return useQuery({
    queryKey: AI_QUERY_KEYS.anomalies(investmentId || ''),
    queryFn: () => aiApi.getAnomalyAnalysis(investmentId!),
    enabled: !!investmentId,
    staleTime: 60 * 1000,
  });
}

export function useRunAnomalyAnalysis(investmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => aiApi.runAnomalyAnalysis(investmentId),
    onSuccess: (data) => {
      queryClient.setQueryData(AI_QUERY_KEYS.anomalies(investmentId), data);
    },
  });
}
