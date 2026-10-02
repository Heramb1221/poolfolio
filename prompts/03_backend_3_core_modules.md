# BACKEND 3 — Groups + Investments + Contributions

Read:
CLAUDE.md
docs/BUSINESS_RULES.md
docs/ROLES.md
docs/DATABASE_SPEC.md
docs/API_CONTRACT.md

Implement:
- groups CRUD
- group membership
- role authorization
- investments CRUD
- investment lifecycle
- contributions API

Critical:
- only OPEN investments allow contribution changes
- LOCKED freezes capital basis
- same stock later means a new Investment
- members cannot edit other members' financial records

Do not implement P&L yet.
Run tests and typecheck.
Commit.
