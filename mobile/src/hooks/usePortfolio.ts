import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useGroups } from './useGroups';
import { investmentsApi } from '../api/investments.api';
import { accountingApi } from '../api/accounting.api';
import { Investment, PnLResponse } from '../types/api';
import { toNum } from '../theme/format';

export interface PortfolioPosition {
  investment: Investment;
  groupName: string;
  pnl?: PnLResponse;
}

const PNL_STATUSES = ['LOCKED', 'ACTIVE', 'SETTLED'];

/**
 * Dashboard read-model.
 *
 * Every money figure comes from the server (`/investments/:id/pnl`). The only
 * thing done here is adding the already-computed server totals together for the
 * hero card — a presentation roll-up, not accounting logic. Ownership, P&L and
 * settlement maths stay in the backend.
 */
export function usePortfolio() {
  const groupsQ = useGroups();
  const groups = groupsQ.data ?? [];

  const invQs = useQueries({
    queries: groups.map((g) => ({
      queryKey: ['groups', g.id, 'investments', undefined] as const,
      queryFn: async () => (await investmentsApi.getGroupInvestments(g.id)).investments,
    })),
  });

  const invList = useMemo(() => {
    const out: { investment: Investment; groupName: string }[] = [];
    invQs.forEach((q, i) => {
      (q.data ?? []).forEach((inv) => out.push({ investment: inv, groupName: groups[i]?.name ?? '' }));
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invQs.map((q) => q.dataUpdatedAt).join('|'), groups.length]);

  const pnlTargets = invList.filter((x) => PNL_STATUSES.includes(x.investment.status));
  const pnlQs = useQueries({
    queries: pnlTargets.map((x) => ({
      queryKey: ['investments', x.investment.id, 'pnl', undefined] as const,
      queryFn: () => accountingApi.getPnL(x.investment.id),
      retry: false,
    })),
  });

  const positions: PortfolioPosition[] = useMemo(() => {
    const pnlById = new Map<string, PnLResponse>();
    pnlTargets.forEach((t, i) => {
      const d = pnlQs[i]?.data;
      if (d) pnlById.set(t.investment.id, d);
    });
    return invList
      .map((x) => ({ ...x, pnl: pnlById.get(x.investment.id) }))
      .sort((a, b) => new Date(b.investment.createdAt).getTime() - new Date(a.investment.createdAt).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invList, pnlQs.map((q) => q.dataUpdatedAt).join('|')]);

  const withPnl = positions.filter((p) => p.pnl);
  const totals = {
    invested: withPnl.reduce((a, p) => a + toNum(p.pnl!.totalInvested), 0),
    value: withPnl.reduce((a, p) => a + toNum(p.pnl!.currentValue), 0),
    netPnl: withPnl.reduce((a, p) => a + toNum(p.pnl!.netPnl), 0),
  };

  // Chart series: server net P&L per investment, oldest → newest.
  const chronological = [...withPnl].reverse();
  const series = {
    values: chronological.map((p) => toNum(p.pnl!.netPnl)),
    labels: chronological.map((p) => p.investment.symbol),
  };

  const counts = {
    groups: groups.length,
    investments: invList.length,
    active: invList.filter((x) => x.investment.status === 'ACTIVE').length,
  };

  const isLoading = groupsQ.isLoading || invQs.some((q) => q.isLoading) || pnlQs.some((q) => q.isLoading);
  const isRefetching = groupsQ.isRefetching;

  const refetch = async () => {
    await groupsQ.refetch();
    await Promise.all([...invQs.map((q) => q.refetch()), ...pnlQs.map((q) => q.refetch())]);
  };

  return { groups, positions, totals, series, counts, hasPnl: withPnl.length > 0, isLoading, isRefetching, refetch };
}
