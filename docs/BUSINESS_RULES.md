# Poolfolio Business Rules

## Groups
A group contains users. One LEADER owns primary administrative authority. CO_LEADERs help operate the group.

## Roles
LEADER:
- create/delete group
- manage members
- assign co-leaders
- create/edit/close investments
- manage transactions
- generate reports

CO_LEADER:
- manage investments
- manage transactions
- generate reports
- cannot remove/replace the leader
- cannot delete the group

MEMBER:
- view group and investments
- view own contributions, ownership, P&L and settlement
- cannot modify other members' financial records

## Investment identity
Every stock/IPO investment instance is independent.
The same stock can have multiple Investment records.

## Lifecycle
DRAFT → OPEN → LOCKED → ACTIVE → SETTLED
DRAFT/OPEN → CANCELLED

DRAFT: leader prepares the investment.
OPEN: members can change intended amounts.
LOCKED: allotment/execution is confirmed; capital basis is frozen.
ACTIVE: investment is held/managed.
SETTLED: final accounting is closed.

## Contribution rule
Before LOCKED, a member may create, increase, decrease or cancel an intended contribution.
After LOCKED, the contribution basis cannot be changed.
A later investment in the same stock/IPO is a new Investment.

## IPO
Track application amount, allocated amount/quantity and refund.
Only the allocated amount becomes invested capital.

## Stock
Track buys, sells, dividends, fees, taxes and other real events.
