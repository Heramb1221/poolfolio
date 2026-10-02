# Poolfolio Reports

Investment report and settlement statement generation for Poolfolio.

## Responsibilities

Generate clean, audit-ready PDF reports and statements for groups and investments:
- **Investment Summary Report:**
  - Investment details (asset, type, broker, dates, status)
  - Locked contributions and fixed ownership percentages
  - Chronological transaction audit trail (buys, sells, allotments, refunds, fees, taxes)
  - Final accounting calculation (realized/unrealized P&L, returns)
  - Individual member settlement breakdown
- **Settlement Statements:**
  - Shareable PDF document detailing final payout calculations and capital return per member.

## Architectural Rule

Report generators must consume authoritative figures calculated by the backend accounting engine. The report module does not perform independent financial calculations.
