# INTEGRATION — Final QA

You are the integration owner.

Read all docs in docs/.

First inspect current code; do not rewrite working modules.

Verify end-to-end:
register
→ login
→ create group
→ add members
→ create investment
→ OPEN contributions
→ modify contribution
→ LOCK
→ reject post-lock contribution changes
→ add investment transactions
→ calculate ownership/P&L
→ settlement
→ PDF
→ AI extraction confirmation
→ anomaly analysis

Fix only integration defects and clear blockers.

Run:
- tests
- typecheck
- build
- Prisma validation

Do not change business rules without explicit approval.
Commit fixes.
