export interface SafeContribution {
  id: string;
  investmentId: string;
  userId: string;
  amount: string;
  contributedAt: Date;
  notes: string | null;
  createdAt: Date;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface MemberContributionBreakdown {
  userId: string;
  userName: string;
  totalAmount: string;
  contributionCount: number;
}

export interface ContributionSummary {
  contributions: SafeContribution[];
  totalAmount: string;
  contributorCount: number;
  memberBreakdown: MemberContributionBreakdown[];
}
