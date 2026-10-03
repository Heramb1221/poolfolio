import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreateInvestmentInput,
  investmentsApi,
  UpdateInvestmentInput,
} from '../api/investments.api';
import { contributionsApi, CreateContributionInput } from '../api/contributions.api';
import { CreateTransactionInput, transactionsApi } from '../api/transactions.api';
import { InvestmentStatus, InvestmentType, TransactionType } from '../types/api';

export const useGroupInvestments = (
  groupId: string,
  params?: { status?: InvestmentStatus; type?: InvestmentType; symbol?: string }
) => {
  return useQuery({
    queryKey: ['groups', groupId, 'investments', params],
    queryFn: async () => {
      const res = await investmentsApi.getGroupInvestments(groupId, params);
      return res.investments;
    },
    enabled: !!groupId,
  });
};

export const useInvestment = (investmentId: string) => {
  return useQuery({
    queryKey: ['investments', investmentId],
    queryFn: async () => {
      const res = await investmentsApi.getInvestment(investmentId);
      return res.investment;
    },
    enabled: !!investmentId,
  });
};

export const useCreateInvestment = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInvestmentInput) =>
      investmentsApi.createInvestment(groupId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'investments'] });
    },
  });
};

export const useUpdateInvestment = (investmentId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateInvestmentInput) =>
      investmentsApi.updateInvestment(investmentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments', investmentId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

export const useContributions = (investmentId: string) => {
  return useQuery({
    queryKey: ['investments', investmentId, 'contributions'],
    queryFn: async () => {
      return contributionsApi.getContributions(investmentId);
    },
    enabled: !!investmentId,
  });
};

export const useCreateContribution = (investmentId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateContributionInput) =>
      contributionsApi.createContribution(investmentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['investments', investmentId, 'contributions'],
      });
      queryClient.invalidateQueries({
        queryKey: ['investments', investmentId, 'ownership'],
      });
    },
  });
};

export const useTransactions = (
  investmentId: string,
  params?: {
    type?: TransactionType;
    userId?: string;
  }
) => {
  return useQuery({
    queryKey: ['investments', investmentId, 'transactions', params],
    queryFn: async () => {
      return transactionsApi.getTransactions(investmentId, params);
    },
    enabled: !!investmentId,
  });
};

export const useCreateTransaction = (investmentId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTransactionInput) =>
      transactionsApi.createTransaction(investmentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['investments', investmentId, 'transactions'],
      });
      queryClient.invalidateQueries({
        queryKey: ['investments', investmentId, 'pnl'],
      });
      queryClient.invalidateQueries({
        queryKey: ['investments', investmentId, 'summary'],
      });
    },
  });
};
