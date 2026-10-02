# Poolfolio — Claude Code Instructions

## Project
Poolfolio is a group investment tracker for friends who pool money into stocks and IPOs.

## Source of truth
Read only the documentation relevant to your assigned task:
- docs/BUSINESS_RULES.md
- docs/DATABASE_SPEC.md
- docs/API_CONTRACT.md
- docs/ACCOUNTING_RULES.md
- docs/AI_SPEC.md
- docs/ARCHITECTURE.md
- docs/ROLES.md

Do not invent financial rules.

## Non-negotiable rules
1. Financial calculations are backend-only.
2. Accounting code is the source of truth for ownership, P&L and settlement.
3. Money uses PostgreSQL Decimal; never Float for financial amounts.
4. Contribution amounts can change only while an investment is OPEN.
5. Once LOCKED, the contribution basis and ownership basis are immutable.
6. A later investment in the same stock/IPO is a new Investment record.
7. AI never writes financial records without validation and explicit user confirmation.
8. Never implement automated trading or real-money payments.
9. Preserve transaction history; do not overwrite financial events.
10. Do not modify another workstream's files unless integration is explicitly assigned.

## Engineering
- Prefer simple modular code over premature abstractions.
- Validate input at API boundaries.
- Keep secrets in environment variables.
- Run tests/build/typecheck relevant to your work before declaring completion.
- Do not refactor unrelated code.

## Git
Work on your assigned branch/worktree. Make small commits with clear messages.
Update docs/DEVELOPMENT_STATUS.md only for your assigned section.
