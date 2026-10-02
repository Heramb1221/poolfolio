# Poolfolio API Contract

Base: /api

## Auth
POST /auth/register
POST /auth/login
POST /auth/logout
GET /auth/me

## Groups
POST /groups
GET /groups
GET /groups/:groupId
PATCH /groups/:groupId
DELETE /groups/:groupId
GET /groups/:groupId/members
POST /groups/:groupId/members
PATCH /groups/:groupId/members/:memberId
DELETE /groups/:groupId/members/:memberId

## Investments
POST /groups/:groupId/investments
GET /groups/:groupId/investments
GET /investments/:investmentId
PATCH /investments/:investmentId
DELETE /investments/:investmentId

## Contributions
POST /investments/:investmentId/contributions
GET /investments/:investmentId/contributions

## Transactions
POST /investments/:investmentId/transactions
GET /investments/:investmentId/transactions
GET /investments/:investmentId/transactions/:transactionId
PATCH /investments/:investmentId/transactions/:transactionId

## Accounting
GET /investments/:investmentId/summary
GET /investments/:investmentId/ownership
GET /investments/:investmentId/pnl
GET /investments/:investmentId/settlements

## AI
POST /ai/documents
POST /ai/documents/:documentId/extract
POST /ai/extractions/:extractionId/confirm
POST /ai/anomaly-analysis/:investmentId
GET /ai/anomaly-analysis/:investmentId

## Reports
GET /investments/:investmentId/report

## API rules
- Authenticate protected routes.
- Authorize by group role.
- Validate request bodies.
- Return consistent error JSON.
- Financial responses must use exact decimal-safe serialization.
- AI extraction must require confirmation before financial writes.
