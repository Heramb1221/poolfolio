/**
 * Services layer
 *
 * Dedicated business logic and accounting engine services reside here.
 * As per AGENTS.md, backend accounting engine is the sole source of truth
 * for calculations including ownership, P&L, and settlements.
 */
export { default as authService, AuthService } from './auth.service';
export { default as groupService, GroupService } from './group.service';
export { default as investmentService, InvestmentService } from './investment.service';
export { default as contributionService, ContributionService } from './contribution.service';
export { default as transactionService, TransactionService } from './transaction.service';
export { default as accountingService, AccountingService } from './accounting.service';
