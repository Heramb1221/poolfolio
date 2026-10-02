# Poolfolio Database Specification

Implement with Prisma + PostgreSQL. This is a specification, not Prisma code.

## User
id, name, email(unique), passwordHash, createdAt, updatedAt.

## Group
id, name, createdBy(User), createdAt, updatedAt.

## GroupMember
id, groupId, userId, role, joinedAt.
Unique(groupId, userId).

Role enum: LEADER, CO_LEADER, MEMBER.

## Investment
id, groupId, name, symbol, type, exchange, broker, status,
startDate, lockDate, endDate, createdAt, updatedAt.

Type: STOCK, IPO.
Status: DRAFT, OPEN, LOCKED, ACTIVE, SETTLED, CANCELLED.

## Contribution
id, investmentId, userId, amount(Decimal), contributedAt, notes, createdAt.
Multiple records are allowed while OPEN.
Do not use contribution records to silently mutate locked capital.

## Transaction
id, investmentId, userId(nullable where appropriate), type,
quantity(Decimal nullable), price(Decimal nullable), amount(Decimal),
transactionDate, reference, notes, createdAt.

Types:
CONTRIBUTION, WITHDRAWAL, BUY, SELL, ALLOTMENT, REFUND,
DIVIDEND, FEE, TAX, ADJUSTMENT.

## Settlement
id, investmentId, userId, investedAmount(Decimal),
ownershipPercentage(Decimal), profitLoss(Decimal), finalAmount(Decimal),
status, settledAt, createdAt.

Status: PENDING, SETTLED.
Values are accounting snapshots, not user-editable inputs.

## BrokerConnection
id, userId, broker, encryptedToken, createdAt, updatedAt.
Never store plaintext credentials.

## Document
id, investmentId, uploadedBy, fileName, fileUrl,
documentType, status, createdAt, updatedAt.

DocumentType:
BROKER_STATEMENT, TRANSACTION_NOTE, IPO_ALLOTMENT, OTHER.

Status:
UPLOADED, PROCESSING, PROCESSED, FAILED.

## AIExtraction
id, documentId, model, extractedData(Json),
confidence, status, confirmedBy, confirmedAt, createdAt.

## Constraints
- Use Decimal for money/quantities/percentages.
- Add foreign keys and useful indexes.
- Prevent duplicate group membership.
- Preserve financial history.
- Do not allow deleting locked financial history through normal user flows.
- Prisma schema must support the lifecycle and role rules.
