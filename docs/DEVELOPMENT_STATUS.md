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
- [ ] transactions
- [ ] accounting
- [ ] settlement

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
  - Backend Task 7 — Transactions.

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
