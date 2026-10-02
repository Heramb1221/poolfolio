# AI 2 — TabPFN Anomaly Detection

Read:
CLAUDE.md
docs/AI_SPEC.md

Implement a small anomaly-analysis service around transaction history.

Use deterministic feature preparation.
Keep output explainable:
- anomaly flag/score
- transaction/member features that contributed

Do not label users as fraudulent.
Do not alter financial records.
If TabPFN setup becomes unstable, keep a clean adapter boundary and a documented fallback/mock for development.

Add tests with synthetic transaction data.
Commit.
