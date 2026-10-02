# Poolfolio Accounting Rules

## Ownership
At LOCKED:
totalLockedAmount = sum of locked member capital.

memberOwnership =
memberLockedAmount / totalLockedAmount

Ownership is investment-specific and remains fixed after LOCKED.

Do not calculate ownership from market value.

## P&L
totalProfitLoss = finalValue - totalInvested

returnPercentage =
(totalProfitLoss / totalInvested) * 100

memberProfitLoss =
totalProfitLoss * memberOwnership

memberSettlement =
memberLockedAmount + memberProfitLoss

Losses are allocated by the same ownership ratio.

## Precision
Do not round intermediate calculations.
Round only for display/reporting.

## Ledger
Use an event ledger:
CONTRIBUTION, WITHDRAWAL, BUY, SELL, ALLOTMENT, REFUND,
DIVIDEND, FEE, TAX, ADJUSTMENT.

Never overwrite historical financial events.

## Locking
Before LOCKED:
- intended contribution can change.

At LOCKED:
- freeze contribution basis
- freeze ownership basis

After LOCKED:
- do not edit member capital to change ownership.
- real investment events may change pool value.

MVP does not support time-weighted ownership.

## IPO
Application amount is historical.
Allocated amount becomes invested capital.
Refund is recorded separately.

Example:
Applied 20,000
Allocated 8,000
Refund 12,000
Capital basis = 8,000

## Accounting architecture
Pure accounting functions/services must live in the backend.
React Native never calculates authoritative financial values.
