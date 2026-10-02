# REPORTS — PDF

You own server/src/modules/reports/.

Read:
CLAUDE.md
docs/ACCOUNTING_RULES.md
docs/API_CONTRACT.md

Implement backend-generated investment PDF.

Report must include:
- group
- investment name/type/symbol
- lifecycle/status
- member contributions
- ownership percentages
- transactions
- invested amount
- final/current value
- P&L
- member settlement
- IPO allocation/refund when applicable

Use accounting service outputs; do not recalculate money in the PDF layer.

Expose GET /investments/:investmentId/report.
Commit.
