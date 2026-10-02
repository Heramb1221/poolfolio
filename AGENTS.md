# Poolfolio — Agent Instructions

## Project

Poolfolio is a group investment tracking application for small groups of friends who pool money to invest in stocks and IPOs.

The application tracks:

- users
- groups
- group roles
- investments
- member contributions
- ownership
- transactions
- P&L
- settlements
- investment reports
- AI-assisted document/transaction extraction
- anomaly detection

The application does NOT execute trades or move money.

Actual investments continue to happen through the users' existing broker.

---

# SOURCE OF TRUTH

The repository and the documents under `/docs` are the source of truth.

Before implementing any feature:

1. Read `AGENTS.md`.
2. Read the relevant documents in `/docs`.
3. Inspect the existing implementation.
4. Determine what is already implemented.
5. Implement only the requested task.

Never assume the repository is empty.

Never rebuild an existing module without a reason.

---

# CRITICAL FINANCIAL RULE

The backend accounting engine is the ONLY source of truth for financial calculations.

The mobile application must NEVER independently calculate:

- ownership
- P&L
- settlement
- investment totals
- member allocation

AI must NEVER independently determine financial results.

---

# OWNERSHIP

Ownership is calculated separately for every Investment.

```text
ownership_percentage =
locked_member_contribution / total_locked_contributions
```

Ownership is based on the member's locked capital contribution.

Ownership is NOT based on:

- current market value
- current share price
- portfolio value
- number of shares unless the business rules explicitly define contribution that way

Ownership percentages remain fixed after the investment is locked.

---

# P&L

Investment profit/loss:

```text
profit_loss =
final_investment_value - total_invested
```

Member profit/loss:

```text
member_profit_loss =
investment_profit_loss × ownership_percentage
```

---

# SETTLEMENT

Member settlement:

```text
member_settlement =
member_locked_contribution + member_profit_loss
```

The same formula handles losses.

Never round intermediate calculations.

Use Decimal for financial values.

---

# INVESTMENT LIFECYCLE

```text
DRAFT
  ↓
OPEN
  ↓
LOCKED
  ↓
ACTIVE
  ↓
SETTLED
```

Cancellation:

```text
DRAFT → CANCELLED
OPEN  → CANCELLED
```

Once an investment becomes `LOCKED`:

- locked member capital cannot be changed
- ownership basis cannot change
- contribution history must remain preserved
- later investment activity must be represented through transactions

---

# IPO RULE

IPO application amount and allocated investment amount are different.

Example:

```text
Applied:    ₹20,000
Allocated:   ₹8,000
Refunded:   ₹12,000
```

Actual investment capital:

```text
₹8,000
```

The application and refund events must still be preserved in the transaction history.

---

# STOCK RULES

BUY:

```text
quantity × price = cost
```

SELL:

```text
quantity × price = revenue
```

Realized P&L:

```text
sale revenue - cost basis
```

Unrealized P&L:

```text
current market value - cost basis
```

Fees and taxes remain separately identifiable.

---

# LEDGER

Financial history must be preserved.

Supported transaction types:

```text
CONTRIBUTION
WITHDRAWAL
BUY
SELL
ALLOTMENT
REFUND
DIVIDEND
FEE
TAX
ADJUSTMENT
```

Do not silently overwrite historical financial events.

Do not delete locked financial history through normal user workflows.

---

# ROLES

## LEADER

Can:

- create group
- delete group
- invite members
- remove members
- assign co-leader
- create investments
- edit investments
- close investments
- add/correct transactions
- generate reports

Cannot be removed by members or co-leader.

## CO_LEADER

Can:

- manage investments
- add/edit transactions
- generate reports

Cannot:

- remove leader
- delete group
- transfer primary ownership

## MEMBER

Can:

- view group
- view investments
- view own contributions
- view ownership
- view P&L
- view settlement
- view reports

Cannot modify another member's financial records.

---

# TECHNOLOGY

Backend:

- Node.js
- Express
- TypeScript
- Prisma
- PostgreSQL
- JWT
- Argon2

Mobile:

- React Native
- Expo
- TypeScript
- Expo Router
- NativeWind
- TanStack Query
- React Hook Form
- Zod
- Expo SecureStore

AI:

- Gemma
- local/open-weight inference where practical
- TabPFN for anomaly detection

Infrastructure:

- Render
- PostgreSQL
- Sentry if useful

---

# FINANCIAL DATA TYPES

Never use JavaScript floating-point numbers as the authoritative representation of money.

Use:

```text
Prisma Decimal
```

and appropriate decimal handling throughout the accounting engine.

---

# AI SAFETY

Gemma may:

- extract information
- classify information
- explain backend-computed results

Gemma may NOT:

- directly write financial records
- determine ownership
- determine settlement
- execute trades
- move money

AI extraction pipeline:

```text
Document
↓
OCR / preprocessing
↓
Gemma
↓
Structured JSON
↓
Schema validation
↓
Confidence
↓
User review
↓
Confirmation
↓
Backend ledger write
```

TabPFN:

```text
Historical transaction features
↓
TabPFN
↓
Anomaly score/flag
```

Anomaly detection is an aid.

Do not automatically label something as fraud.

---

# ENGINEERING RULES

Use TypeScript throughout the application where applicable.

Validate API inputs.

Use centralized error handling.

Use authentication and authorization on protected routes.

Never expose secrets to the mobile application.

Never commit:

- passwords
- API keys
- JWT secrets
- broker credentials
- production database credentials

Use `.env.example` for configuration documentation.

Keep accounting logic in backend services.

Do not duplicate business logic between controllers and clients.

Prefer small, testable modules.

---

# CHANGE MANAGEMENT

Before modifying an existing feature:

1. Inspect the implementation.
2. Read the relevant specification.
3. Identify dependencies.
4. Make the smallest appropriate change.
5. Run tests.
6. Run type checking/build.
7. Review the diff.

Do not perform broad rewrites unless explicitly requested.

---

# SCOPE CONTROL

Do not add features merely because they seem useful.

MVP includes:

- authentication
- groups
- roles
- investments
- contributions
- ownership
- transactions
- P&L
- settlement
- dashboard
- investment PDF report
- Gemma extraction
- TabPFN anomaly detection
- Render deployment

Not MVP:

- automated trading
- payments
- UPI integration
- complex broker reconciliation
- Kubernetes
- microservices
- voice assistant
- financial advice chatbot
- complex RAG
- fine-tuning
- automated money transfers

---

# TASK DISCIPLINE

Work only on the task requested in the current prompt.

Do not implement future tasks unless required as a dependency.

If another feature is needed but outside the task:

- explain why it is needed
- implement only the minimum required dependency
- document it

---

# WHEN A TASK IS COMPLETE

Report:

## Implemented

What was built.

## Files Changed

Every created or modified file.

## Tests

Tests executed and their results.

## Validation

Type checking/build/lint results.

## Issues

Known problems or unresolved questions.

## Next Task

What should logically be implemented next.

Do not claim something is complete unless it has actually been implemented and validated.