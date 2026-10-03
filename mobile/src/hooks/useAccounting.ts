import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingApi } from '../api/accounting.api';

export const useOwnership = (investmentId: string) => {
  return useQuery({
    queryKey: ['investments', investmentId, 'ownership'],
    queryFn: () => accountingApi.getOwnership(investmentId),
    enabled: !!investmentId,
  });
};

export const usePnL = (investmentId: string, currentPrice?: string) => {
  return useQuery({
    queryKey: ['investments', investmentId, 'pnl', currentPrice],
    queryFn: () => accountingApi.getPnL(investmentId, currentPrice),
    enabled: !!investmentId,
  });
};

export const useSettlements = (investmentId: string) => {
  return useQuery({
    queryKey: ['investments', investmentId, 'settlements'],
    queryFn: () => accountingApi.getSettlements(investmentId),
    enabled: !!investmentId,
  });
};

export const useSettleInvestment = (investmentId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => accountingApi.settleInvestment(investmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['investments', investmentId],
      });
      queryClient.invalidateQueries({
        queryKey: ['investments', investmentId, 'settlements'],
      });
      queryClient.invalidateQueries({
        queryKey: ['investments', investmentId, 'summary'],
      });
    },
  });
};

export const useInvestmentSummary = (investmentId: string, currentPrice?: string) => {
  return useQuery({
    queryKey: ['investments', investmentId, 'summary', currentPrice],
    queryFn: () => accountingApi.getSummary(investmentId, currentPrice),
    enabled: !!investmentId,
  });
};
