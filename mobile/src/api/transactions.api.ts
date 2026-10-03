import { apiClient } from './client';
import { Transaction, TransactionSummary, TransactionType } from '../types/api';

export interface CreateTransactionInput {
  type: TransactionType;
  amount: string;
  quantity?: string;
  price?: string;
  transactionDate?: string;
  reference?: string;
  notes?: string;
  userId?: string;
}

export interface UpdateTransactionInput {
  reference?: string;
  notes?: string;
  transactionDate?: string;
}

export const transactionsApi = {
  async getTransactions(
    investmentId: string,
    params?: {
      type?: TransactionType;
      userId?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<TransactionSummary> {
    return apiClient<TransactionSummary>(
      `/investments/${investmentId}/transactions`,
      {
        method: 'GET',
        params,
      }
    );
  },

  async getTransaction(
    investmentId: string,
    transactionId: string
  ): Promise<{ transaction: Transaction }> {
    return apiClient<{ transaction: Transaction }>(
      `/investments/${investmentId}/transactions/${transactionId}`,
      {
        method: 'GET',
      }
    );
  },

  async createTransaction(
    investmentId: string,
    input: CreateTransactionInput
  ): Promise<{ transaction: Transaction }> {
    return apiClient<{ transaction: Transaction }>(
      `/investments/${investmentId}/transactions`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    );
  },

  async updateTransaction(
    investmentId: string,
    transactionId: string,
    input: UpdateTransactionInput
  ): Promise<{ transaction: Transaction }> {
    return apiClient<{ transaction: Transaction }>(
      `/investments/${investmentId}/transactions/${transactionId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      }
    );
  },
};
