# Poolfolio

> **Group investment ledger for friends who pool money into stocks and IPOs.**

Poolfolio brings clarity, transparency, and accounting precision to informal investment clubs. When friends pool money to buy stocks or apply for IPOs, tracking varying contribution amounts, allotment differences, refunds, broker charges, and final profit/loss distributions quickly becomes error-prone. Poolfolio centralizes and automates this bookkeeping while keeping actual trade execution with users' existing brokers.

---

## The Problem It Solves

Small groups of friends frequently collaborate on stock market investments and IPO bids, contributing differing amounts based on affordability. Today, these arrangements are typically managed through fragmented channels:
- WhatsApp and messaging threads
- Scattered spreadsheets with manual formulas
- Paper notes and screenshots
- Ad-hoc mental math for settlements and refunds

This leads to recurring challenges:
- **Disputed Ownership:** Confusion over who owns what percentage once allocations or purchase prices change.
- **IPO Allocation Complexity:** Inability to accurately reconcile bid application amounts vs. actual allotted amounts vs. bank refunds.
- **Untracked Friction:** Hidden fees, brokerage charges, and taxes getting missed when calculating net return.
- **Settlement Friction:** Awkwardness and errors when calculating each member's exact capital return and profit/loss share at exit.

Poolfolio provides an immutable, transparent investment ledger where every contribution is tracked, ownership is fixed upon investment locking, and all financial metrics are calculated authoritatively by the backend.

---

## High-Level Architecture

```
                   +---------------------------+
                   |  React Native (Expo) App  |
                   |   (iOS, Android, Web)     |
                   +-------------+-------------+
                                 | HTTPS / REST
                                 v
                   +---------------------------+
                   |   Node.js / Express API   |
                   |    (TypeScript Server)    |
                   +-------------+-------------+
                                 |
         +-----------------------+-----------------------+
         |                       |                       |
         v                       v                       v
+-----------------+     +-----------------+     +-----------------+
| Backend Services|     |  AI Subsystem   |     | Report Engine   |
|   & Accounting  |     | (Gemma+TabPFN)  |     | (PDF Generator) |
+--------+--------+     +--------+--------+     +-----------------+
         |                       |
         |                       | (Extract & Verify)
         +----------+------------+
                    |
                    v
         +---------------------+
         | Prisma ORM (Decimal)|
         +----------+----------+
                    |
                    v
         +---------------------+
         | PostgreSQL Database |
         +---------------------+
```

### Core Architecture Principles
1. **Backend Accounting Authority:** The backend accounting engine is the **single source of truth** for all financial calculations (ownership, P&L, and settlements). Mobile clients and AI models never calculate financial numbers independently.
2. **Deterministic Ownership:** For every investment, member ownership percentage is fixed based on locked capital contribution:
   $$\text{Ownership \%} = \frac{\text{Member Locked Contribution}}{\text{Total Locked Contributions}}$$
3. **Immutable History:** Once an investment transitions to `LOCKED`, the contribution basis cannot be altered. Subsequent activity (buys, sells, allotments, refunds, fees) is captured as discrete ledger transactions.
4. **Human-in-the-Loop AI:** AI models (Gemma) extract structured records from uploaded broker statements and contract notes; transactions are only written to the ledger after explicit human review and confirmation.
5. **Non-Custodial:** Poolfolio does not hold funds, execute market orders, or move fiat money. Trades occur through users' regular brokers.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Backend API** | Node.js, Express, TypeScript |
| **Database & ORM** | PostgreSQL, Prisma (using `Decimal` for financial values) |
| **Authentication** | JWT, Argon2 password hashing |
| **Mobile Client** | React Native, Expo, TypeScript, Expo Router, NativeWind (Tailwind CSS) |
| **Client State** | TanStack Query (React Query), React Hook Form, Zod, Expo SecureStore |
| **AI / ML** | Gemma (document and statement data extraction), TabPFN (transaction anomaly detection) |
| **Reporting** | PDF generation engine |
| **Infrastructure** | Render (API hosting, PostgreSQL), Sentry (monitoring) |

---

## Directory Structure

```
poolfolio/
├── server/          # Node.js + Express + TypeScript API, Prisma ORM, Accounting Engine
├── mobile/          # React Native + Expo mobile application
├── ai/              # Gemma statement extraction and TabPFN anomaly detection pipelines
├── reports/         # PDF report generators and settlement statement exports
├── docs/            # Specifications, business rules, accounting rules, API contracts
├── prompts/         # Sequential development prompts and task guides
├── AGENTS.md        # Core instructions and rules for AI development agents
├── CLAUDE.md        # Workstream guidelines and system boundaries
├── GUIDE.md         # Multi-account development execution guide
└── README.md        # Project overview and architecture (this document)
```

---

## Development Status

The repository foundation has been initialized:
- [x] Monorepo directory structure established (`server/`, `mobile/`, `ai/`, `reports/`, `docs/`)
- [x] Source of truth specifications and architectural rules documented in `docs/`
- [x] Environment templates (`.env.example`) and comprehensive `.gitignore` configured
- [ ] Backend foundation and Prisma configuration (Next step: `prompts/01_backend_1_foundation.md`)
- [ ] Authentication, groups, investments, and accounting engine
- [ ] Mobile Expo client foundation and core UI
- [ ] AI extraction and anomaly pipelines
- [ ] PDF reporting engine
- [ ] Integration QA, deployment on Render, and friend testing

For detailed task-by-task tracking, refer to [docs/DEVELOPMENT_STATUS.md](file:///f:/Programming%20Languages/React%20Native/projects/poolfolio/docs/DEVELOPMENT_STATUS.md).
