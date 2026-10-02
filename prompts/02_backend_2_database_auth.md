# BACKEND 2 — Database + Auth

Read:
CLAUDE.md
docs/DATABASE_SPEC.md
docs/ROLES.md
docs/API_CONTRACT.md

Implement:
- final Prisma schema from DATABASE_SPEC.md
- migration
- Prisma client
- User model usage
- register/login/logout/me
- JWT handling
- Argon2 password hashing
- authentication middleware

Do not modify accounting rules.
Do not add broker integration.

Test:
- duplicate email
- invalid password
- protected route
- valid login

Run Prisma validation, migration check, typecheck and tests.
Commit only this work.
