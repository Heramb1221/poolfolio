import { apiClient } from './client';
import { Investment, InvestmentStatus, InvestmentType } from '../types/api';

export interface CreateInvestmentInput {
  name: string;
  symbol: string;
  type: InvestmentType;
  exchange?: string;
  broker?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateInvestmentInput {
  name?: string;
  symbol?: string;
  type?: InvestmentType;
  exchange?: string;
  broker?: string;
  status?: InvestmentStatus;
  startDate?: string;
  lockDate?: string;
  endDate?: string;
}

export const investmentsApi = {
  async getGroupInvestments(
    groupId: string,
    params?: { status?: InvestmentStatus; type?: InvestmentType; symbol?: string }
  ): Promise<{ investments: Investment[] }> {
    return apiClient<{ investments: Investment[] }>(`/groups/${groupId}/investments`, {
      method: 'GET',
      params,
    });
  },

  async getInvestment(investmentId: string): Promise<{ investment: Investment }> {
    return apiClient<{ investment: Investment }>(`/investments/${investmentId}`, {
      method: 'GET',
    });
  },

  async createInvestment(
    groupId: string,
    input: CreateInvestmentInput
  ): Promise<{ investment: Investment }> {
    return apiClient<{ investment: Investment }>(`/groups/${groupId}/investments`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateInvestment(
    investmentId: string,
    input: UpdateInvestmentInput
  ): Promise<{ investment: Investment }> {
    return apiClient<{ investment: Investment }>(`/investments/${investmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async deleteInvestment(investmentId: string): Promise<void> {
    return apiClient<void>(`/investments/${investmentId}`, {
      method: 'DELETE',
    });
  },
};
