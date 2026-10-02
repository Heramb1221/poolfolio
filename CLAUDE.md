# Poolfolio — Claude Instructions

## Project

Poolfolio is a group investment tracking application for small groups of friends who pool money to invest in stocks and IPOs.

The application tracks:

- groups
- members
- investments
- contributions
- ownership
- transactions
- P&L
- settlements
- reports
- AI-assisted transaction/document extraction
- anomaly detection

The real money/accounting logic is handled by the backend.

---

## Critical Rule

AI must NEVER calculate or decide financial values.

The backend accounting engine is the source of truth.

Gemma may:

- extract information
- classify documents
- explain computed results

TabPFN may:

- detect anomalous transaction patterns

Neither AI system may directly modify financial records.

All AI-generated structured data must be validated and confirmed before being written to the financial database.

---

## Ownership

For every individual Investment:

ownership_percentage =
member_locked_contribution / total_locked_contributions

Member P&L:

member_profit_loss =
investment_profit_loss × ownership_percentage

Settlement:

member_settlement =
member_locked_contribution + member_profit_loss

Ownership is based on capital contribution, NOT current market value.

---

## Investment Lifecycle

DRAFT
→ OPEN
→ LOCKED
→ ACTIVE
→ SETTLED

DRAFT/OPEN
→ CANCELLED

Once an investment is LOCKED:

- member capital cannot be changed
- ownership basis cannot change
- contribution history must remain immutable
- later investment events must be represented through transactions

---

## IPO

IPO applications and actual allocated capital are different.

Example:

Applied: ₹20,000
Allocated: ₹8,000
Refunded: ₹12,000

Actual investment capital = ₹8,000.

The application and refund history must still be preserved.

---

## Stock Accounting

BUY:

quantity × price = cost

SELL:

quantity × price = revenue

Realized P&L:

sale revenue - cost basis

Unrealized P&L:

current market value - cost basis

Fees and taxes must remain separately identifiable.

---

## Ledger

Financial history must be preserved.

Transaction types include:

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

Do not silently overwrite historical financial events.

---

## Engineering Rules

Use TypeScript.

Use PostgreSQL.

Use Prisma.

Use Decimal for financial values.

Do not use floating-point numbers for money.

Keep financial calculations in backend services.

Do not duplicate accounting logic in React Native.

Use validation at API boundaries.

Use authentication and authorization for every protected endpoint.

Do not expose secrets to the mobile application.

---

## Before Changing Code

Read the relevant files in:

docs/

Do not modify business rules unless explicitly instructed.

If a requirement conflicts with an existing specification:

STOP and explain the conflict before implementing it.

---

## Completion

When finishing a task:

1. Explain what was implemented.
2. List files created/modified.
3. Explain tests performed.
4. Explain anything not completed.
5. Explain any integration considerations for the next developer.