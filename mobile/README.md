# Poolfolio Mobile

React Native mobile client for Poolfolio.

## Responsibilities

The mobile application provides a clean, reactive mobile interface for group members and leaders:
- User registration and login
- Group dashboard and member management
- Investment exploration, creation, and contribution tracking
- Live review of locked ownership, portfolio performance, and settlement figures
- Document/statement upload with preview of AI-extracted data
- User confirmation workflow for transaction ingestion
- Export and viewing of PDF investment reports

## Technology Stack

- **Framework:** React Native with Expo (Managed Workflow)
- **Language:** TypeScript
- **Navigation:** Expo Router (file-based routing)
- **Styling:** NativeWind (Tailwind CSS for React Native)
- **State & Data Fetching:** TanStack Query (React Query)
- **Forms & Validation:** React Hook Form + Zod
- **Secure Storage:** Expo SecureStore

## Critical Rules

1. **Display Only:** The mobile client is strictly a presentation and data-entry layer.
2. **Never Calculate Financial Truth:** The client must NEVER independently calculate:
   - Ownership percentages
   - Investment or member P&L
   - Settlement amounts
   - Aggregate investment valuations
   All financial metrics must be retrieved directly from the backend accounting engine.
