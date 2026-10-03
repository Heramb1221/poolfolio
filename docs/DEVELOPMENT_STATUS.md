# Poolfolio Development Status

Update only your assigned section.

## Repository Setup
- [x] project structure initialized (server/, mobile/, ai/, reports/, docs/)
- [x] source of truth documentation established
- [x] environment templates (.env.example) and .gitignore configured

## Backend
- [x] foundation
- [x] Prisma
- [x] auth
- [x] groups/roles
- [x] investments
- [x] contributions
- [x] transactions
- [x] accounting
- [x] settlement

### Task 5 — Investments Implementation Notes
- **Implemented**:
  - Full investment lifecycle (`DRAFT` → `OPEN` → `LOCKED` → `ACTIVE` → `SETTLED`, plus `DRAFT`/`OPEN` → `CANCELLED`).
  - Strict lifecycle transition validation preventing invalid jumps and prohibiting re-opening of terminal `SETTLED` or `CANCELLED` states.
  - Creation endpoint: `POST /api/groups/:groupId/investments` (LEADER/CO_LEADER only, begins in `DRAFT`).
  - Group investments listing: `GET /api/groups/:groupId/investments` (all group members, supports query filters for status, type, and symbol).
  - Single investment retrieval: `GET /api/investments/:investmentId` (strict group membership authorization).
  - Investment update: `PATCH /api/investments/:investmentId` (LEADER/CO_LEADER only, validates lifecycle transitions, sets `startDate` on `OPEN`, sets/preserves `lockDate` on `LOCKED`, sets `endDate` on `SETTLED`).
  - Safe deletion: `DELETE /api/investments/:investmentId` (LEADER/CO_LEADER only, blocked if status is `LOCKED`, `ACTIVE`, `SETTLED`, or if contributions/transactions exist).
  - Cross-group security: Users belonging to different groups (including leaders of other groups) cannot access or modify investments across groups.
- **Files Changed / Created**:
  - `server/src/types/investment.ts`
  - `server/src/middleware/investment.validation.ts`
  - `server/src/services/investment.service.ts`
  - `server/src/controllers/investment.controller.ts`
  - `server/src/routes/investment.routes.ts`
  - `server/src/routes/group.routes.ts`
  - `server/src/routes/index.ts`
  - `server/src/__tests__/investment.test.ts`
  - `server/package.json`
- **Database Changes**:
  - Utilized existing `Investment` model and `InvestmentStatus` / `InvestmentType` enums defined in Prisma schema without schema alteration.
- **Lifecycle Rules**:
  - Valid: `DRAFT -> OPEN`, `DRAFT -> CANCELLED`, `OPEN -> LOCKED`, `OPEN -> CANCELLED`, `LOCKED -> ACTIVE`, `ACTIVE -> SETTLED`.
  - Invalids rejected with 400 Bad Request.
  - Automatic timestamping on state transitions: `startDate` on entering `OPEN`, `lockDate` on entering `LOCKED` (preserved thereafter), `endDate` on entering `SETTLED`.
- **Authorization**:
  - `LEADER`: Full create, read, update, lifecycle progression, cancel, eligible delete.
  - `CO_LEADER`: Create, read, update, lifecycle progression, cancel, eligible delete.
  - `MEMBER`: Read-only for group investments.
  - Cross-group access: 403 Forbidden even for leaders of foreign groups.
- **Tests Added**:
  - 33 automated tests in `src/__tests__/investment.test.ts` covering creation, role authorization, cross-group security, lifecycle transitions, invalid transition rejections, deletion guards, and independent investments for identical symbols.
- **Known Limitations**:
  - Contributions and transactions were not yet enabled in Task 5; contributions are implemented in Task 6.
- **Next Recommended Task**:
  - Backend Task 6 — Contributions (Completed).

### Task 6 — Contributions Implementation Notes
- **Implemented**:
  - Contribution creation (`POST /api/investments/:investmentId/contributions`):
    - Enabled strictly during the `OPEN` lifecycle status.
    - Members can contribute for themselves. Leaders and Co-Leaders can record contributions for other group members.
    - Multiple contributions per member are supported during `OPEN`.
    - Strictly rejects contributions when investment status is `DRAFT`, `LOCKED`, `ACTIVE`, `SETTLED`, or `CANCELLED`.
  - Authoritative accounting calculation & retrieval (`GET /api/investments/:investmentId/contributions`):
    - Backend calculation using `Prisma.Decimal` — no floating-point arithmetic.
    - Returns exact decimal string formatting (`toFixed(4)`), total investment contribution sum, unique contributor count, and individual member breakdown.
    - Supports query filter by `userId`.
  - Single contribution retrieval (`GET /api/investments/:investmentId/contributions/:contributionId`):
    - Full details with user metadata.
  - Contribution update (`PATCH /api/investments/:investmentId/contributions/:contributionId`):
    - Mutable only while investment is `OPEN`.
    - Members can modify their own contributions; Leaders and Co-Leaders can modify any group contribution.
    - Strictly blocked once investment is `LOCKED` (freezing capital basis).
  - Contribution cancellation / deletion (`DELETE /api/investments/:investmentId/contributions/:contributionId`):
    - Deletion allowed only while investment is `OPEN`.
    - Members can delete their own contributions; Leaders and Co-Leaders can delete group contributions.
    - Blocked once investment is `LOCKED` or beyond.
  - Cross-group security: Users from outside the investment's group cannot view, add, modify, or delete contributions.
- **Files Changed / Created**:
  - `server/src/types/contribution.ts`
  - `server/src/middleware/contribution.validation.ts`
  - `server/src/services/contribution.service.ts`
  - `server/src/controllers/contribution.controller.ts`
  - `server/src/routes/contribution.routes.ts`
  - `server/src/routes/investment.routes.ts`
  - `server/src/__tests__/contribution.test.ts`
  - `server/package.json`
- **Database Changes**:
  - Leveraged existing `Contribution` model with `Decimal(18, 4)` precision.
- **Tests Added**:
  - 20 automated tests in `src/__tests__/contribution.test.ts` covering creation rules, `OPEN` status restrictions, `LOCKED` status freezing, authoritative totals, role updates, deletion rules, and cross-group protection.
- **Known Limitations**:
  - Transactions and ledger integration will be added in Task 7.
- **Next Recommended Task**:
  - Backend Task 7 — Transactions & Accounting (Completed).

### Task 7 — Transactions & Accounting APIs Implementation Notes
- **Implemented**:
  - Pure Accounting Math Engine (`AccountingService`):
    - Zero floating-point arithmetic; strict usage of `Prisma.Decimal` with unrounded intermediate steps.
    - Deterministic ownership calculation (`ownership = memberLockedContribution / totalLockedContributions`).
    - Multi-member unequal/equal capital allocations and multiple contribution consolidation.
    - P&L calculation allocating returns/losses symmetrically based on fixed locked ownership.
    - Separate accounting for dividends, fees, and taxes.
    - Stock trading metrics (quantities bought/sold, average buy/sell prices, cost basis of sold shares, unrealized P&L on held shares).
    - IPO capital basis handling (applied amount, allocated investment capital basis, refund preservation).
    - Member payout/settlement formulas (`memberSettlement = memberLockedContribution + memberNetPnL`).
  - Ledger Transaction Endpoints:
    - Creation (`POST /api/investments/:investmentId/transactions`): LEADER/CO_LEADER only. Blocked on `DRAFT`, `CANCELLED`, or `SETTLED`. Supports all 10 transaction types (`CONTRIBUTION`, `WITHDRAWAL`, `BUY`, `SELL`, `ALLOTMENT`, `REFUND`, `DIVIDEND`, `FEE`, `TAX`, `ADJUSTMENT`). Validates target user is in group if provided.
    - Listing (`GET /api/investments/:investmentId/transactions`): Group members only. Supports filtering by `type`, `userId`, `startDate`, `endDate`, and computes summary breakdown with total amounts per type.
    - Single retrieval (`GET /api/investments/:investmentId/transactions/:transactionId`): Group members only.
    - Updating (`PATCH /api/investments/:investmentId/transactions/:transactionId`): LEADER/CO_LEADER only. Modifies reference/notes/date without silent manipulation of historic amounts. Blocked on `SETTLED`.
    - Historical preservation: Normal deletion endpoints are omitted per financial audit rules.
  - Accounting & Settlement Endpoints:
    - `GET /api/investments/:investmentId/ownership`: Returns authoritative fixed ownership percentages and locked capital.
    - `GET /api/investments/:investmentId/pnl`: Returns authoritative realized P&L, fees, taxes, dividends, and member allocations (with optional `currentPrice` for unrealized valuation).
    - `GET /api/investments/:investmentId/settlements`: Dynamic payout projection prior to close, or returns persisted settlement records once settled.
    - `POST /api/investments/:investmentId/settle`: LEADER/CO_LEADER atomic transaction settling investment and persisting permanent `Settlement` records in database.
    - `GET /api/investments/:investmentId/summary`: Full composite overview combining capital, trading stats, IPO metrics, performance, and member allocations.
- **Files Changed / Created**:
  - `server/src/types/transaction.ts`
  - `server/src/types/accounting.ts`
  - `server/src/middleware/transaction.validation.ts`
  - `server/src/middleware/accounting.validation.ts`
  - `server/src/services/transaction.service.ts`
  - `server/src/services/accounting.service.ts`
  - `server/src/services/index.ts`
  - `server/src/controllers/transaction.controller.ts`
  - `server/src/controllers/accounting.controller.ts`
  - `server/src/routes/transaction.routes.ts`
  - `server/src/routes/accounting.routes.ts`
  - `server/src/routes/investment.routes.ts`
  - `server/src/__tests__/accounting.unit.test.ts`
  - `server/src/__tests__/transaction.test.ts`
  - `server/package.json`
- **Tests Added**:
  - 10 pure accounting unit tests in `src/__tests__/accounting.unit.test.ts` covering equal/unequal ownership, multi-contributions, profit/loss allocations, fee/dividend impacts, unrealized price valuation, IPO allotment/refund rules, and Decimal precision.
  - Integration tests in `src/__tests__/transaction.test.ts` covering role authorization, lifecycle guards, transaction CRUD, accounting endpoints, and settlement execution.
- **Next Recommended Task**:
  - Mobile Foundation & Core UI (`prompts/06_mobile_1_foundation.md` & `prompts/07_mobile_2_core_ui.md`) or AI Extraction pipeline (`prompts/09_ai_gemma.md`).

## Mobile
- [ ] Expo foundation
- [ ] auth
- [ ] dashboard
- [ ] groups
- [ ] investments
- [ ] contributions
- [ ] transactions
- [ ] settlement
- [ ] AI import
- [ ] reports

## AI
- [ ] Gemma extraction
- [ ] validation
- [ ] confirmation
- [ ] TabPFN anomaly detection

## Reports
- [ ] PDF generator
- [ ] investment report
- [ ] member breakdown

## Integration
- [ ] end-to-end flow
- [ ] Render deployment
- [ ] Sentry
- [ ] production configuration
- [ ] demo data
- [ ] friend testing
