# Poolfolio Server

Backend service for Poolfolio — a group investment ledger application for friends who pool money to invest in stocks and IPOs.

## Responsibilities

The backend server is the **sole source of truth** for all business rules and financial calculations, including:
- User authentication and authorization (JWT + Argon2)
- Group and role management (LEADER, CO_LEADER, MEMBER)
- Investment lifecycle management (`DRAFT` → `OPEN` → `LOCKED` → `ACTIVE` → `SETTLED`)
- Immutable financial ledger (CONTRIBUTION, WITHDRAWAL, BUY, SELL, ALLOTMENT, REFUND, DIVIDEND, FEE, TAX, ADJUSTMENT)
- Authoritative financial calculations:
  - Ownership percentages (based on locked capital contribution)
  - Investment and member P&L (realized and unrealized)
  - Settlement distribution
- Document upload handling and AI extraction validation/confirmation
- Report generation endpoints

## Technology Stack

- **Runtime:** Node.js (v18+)
- **Framework:** Express with TypeScript
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Security:** Argon2 for password hashing, jsonwebtoken for JWT authentication
- **Precision:** `Prisma.Decimal` / `decimal.js` for all financial figures (never IEEE 754 floats)
- **Deployment:** Render

## Critical Architecture & Financial Rules

1. **Backend Owns Calculations:** The mobile application, AI models, and reports must never calculate ownership, P&L, or settlement amounts independently.
2. **Immutable Locked Capital:** Once an investment reaches `LOCKED` status, the contribution basis and ownership ratio are frozen. Subsequent activity is recorded as distinct ledger transactions.
3. **No Direct Money Movement:** Poolfolio tracks investment records and pooling ledgers; it does not execute trades or move fiat currency.
