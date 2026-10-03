import { apiClient } from './client';
import { Contribution, ContributionSummary } from '../types/api';

export interface CreateContributionInput {
  amount: string;
  contributedAt?: string;
  notes?: string;
  userId?: string;
}

export interface UpdateContributionInput {
  amount?: string;
  notes?: string;
}

export const contributionsApi = {
  async getContributions(
    investmentId: string,
    params?: { userId?: string }
  ): Promise<ContributionSummary> {
    return apiClient<ContributionSummary>(
      `/investments/${investmentId}/contributions`,
      {
        method: 'GET',
        params,
      }
    );
  },

  async createContribution(
    investmentId: string,
    input: CreateContributionInput
  ): Promise<{ contribution: Contribution }> {
    return apiClient<{ contribution: Contribution }>(
      `/investments/${investmentId}/contributions`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    );
  },

  async updateContribution(
    investmentId: string,
    contributionId: string,
    input: UpdateContributionInput
  ): Promise<{ contribution: Contribution }> {
    return apiClient<{ contribution: Contribution }>(
      `/investments/${investmentId}/contributions/${contributionId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      }
    );
  },

  async deleteContribution(
    investmentId: string,
    contributionId: string
  ): Promise<void> {
    return apiClient<void>(
      `/investments/${investmentId}/contributions/${contributionId}`,
      {
        method: 'DELETE',
      }
    );
  },
};
