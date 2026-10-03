import { apiClient } from './client';
import {
  InvestmentAccountingSummary,
  OwnershipResponse,
  PnLResponse,
  SettlementsResponse,
} from '../types/api';

export const accountingApi = {
  /**
   * Fetch server-calculated ownership breakdown.
   * Strictly read-only presentation.
   */
  async getOwnership(investmentId: string): Promise<OwnershipResponse> {
    return apiClient<OwnershipResponse>(
      `/investments/${investmentId}/ownership`,
      {
        method: 'GET',
      }
    );
  },

  /**
   * Fetch server-calculated P&L breakdown.
   * Strictly read-only presentation.
   */
  async getPnL(
    investmentId: string,
    currentPrice?: string
  ): Promise<PnLResponse> {
    return apiClient<PnLResponse>(`/investments/${investmentId}/pnl`, {
      method: 'GET',
      params: currentPrice ? { currentPrice } : undefined,
    });
  },

  /**
   * Fetch server-calculated settlements.
   * Strictly read-only presentation.
   */
  async getSettlements(investmentId: string): Promise<SettlementsResponse> {
    return apiClient<SettlementsResponse>(
      `/investments/${investmentId}/settlements`,
      {
        method: 'GET',
      }
    );
  },

  /**
   * Settle investment (Leader / Co-Leader only).
   */
  async settleInvestment(investmentId: string): Promise<SettlementsResponse> {
    return apiClient<SettlementsResponse>(
      `/investments/${investmentId}/settle`,
      {
        method: 'POST',
      }
    );
  },

  /**
   * Fetch comprehensive server-computed investment accounting summary.
   */
  async getSummary(
    investmentId: string,
    currentPrice?: string
  ): Promise<InvestmentAccountingSummary> {
    return apiClient<InvestmentAccountingSummary>(
      `/investments/${investmentId}/summary`,
      {
        method: 'GET',
        params: currentPrice ? { currentPrice } : undefined,
      }
    );
  },
};
