# BACKEND 4 — Accounting

Read:
CLAUDE.md
docs/ACCOUNTING_RULES.md
docs/BUSINESS_RULES.md
docs/DATABASE_SPEC.md

Implement pure backend accounting services:
- ownership
- P&L
- settlement
- stock event handling
- IPO allocation/refund handling

Use Decimal-safe arithmetic.
Do not calculate authoritative values in the mobile app.
Do not round intermediate calculations.

Write focused unit tests for:
- equal contributions
- unequal contributions
- profit
- loss
- IPO partial allotment
- zero/invalid capital
- locked contribution immutability

Commit only accounting work.
