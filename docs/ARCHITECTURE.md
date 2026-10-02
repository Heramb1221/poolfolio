# Poolfolio Architecture

## Stack
- Mobile: React Native + Expo + TypeScript + Expo Router + NativeWind
- Backend: Node.js + Express + TypeScript
- ORM: Prisma
- Database: PostgreSQL
- Auth: JWT + Argon2
- AI: Gemma
- Anomaly detection: TabPFN
- PDF: backend-generated
- Deployment: Render
- Observability: Sentry

## System
React Native
→ Express API
→ business services
→ accounting engine
→ Prisma
→ PostgreSQL

AI pipeline:
Document upload
→ extraction/OCR
→ Gemma
→ structured output
→ validation
→ user confirmation
→ ledger

Anomaly pipeline:
transaction history
→ feature preparation
→ TabPFN
→ anomaly result
→ optional Gemma explanation

## Ownership
Backend owns all financial calculations.
Mobile displays server results.
AI proposes/explains; it does not determine accounting truth.

## Repository
mobile/
server/
docs/
