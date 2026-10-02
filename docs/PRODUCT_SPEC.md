# Poolfolio — Product Specification

## Problem

A small group of friends pools money to invest in stocks and IPOs.

Different members contribute different amounts based on their affordability.

The current process is commonly managed using:

- paper notes
- WhatsApp messages
- spreadsheets
- manual calculations

This makes it difficult to reliably track:

- who invested
- how much each person contributed
- ownership
- transactions
- profit/loss
- settlement amounts
- investment history

Poolfolio centralizes this process.

---

# Product Goal

Poolfolio should provide a reliable investment ledger for a group of friends.

For every investment, the system should answer:

1. Who participated?
2. How much did each member contribute?
3. What percentage does each member own?
4. What transactions occurred?
5. What is the current/final value?
6. What is the total P&L?
7. What is each member's P&L?
8. How much should each member receive at settlement?
9. What evidence/documents support the transactions?

---

# Investment Model

Every stock or IPO participation is represented by a separate Investment.

Example:

```text
Investment #1
RELIANCE
January

Investment #2
RELIANCE
March
```

These are two independent investments.

Ownership and P&L are calculated separately.

---

# Typical Workflow

```text
Create Investment
       ↓
Open Contributions
       ↓
Members enter amounts
       ↓
Investment is Locked
       ↓
Ownership becomes fixed
       ↓
Investment activity occurs
       ↓
Transactions recorded
       ↓
Current/final value determined
       ↓
P&L calculated
       ↓
Settlement generated
       ↓
PDF report generated
```

---

# AI Workflow

Users can upload:

- broker statements
- transaction notes
- IPO allotment documents
- photographs
- PDFs

Gemma extracts structured information.

The extracted information is shown to the user.

The user confirms it.

Only then does the backend create financial ledger records.

---

# Anomaly Detection

Poolfolio may use TabPFN to identify unusual transaction patterns.

This is intended to assist review.

It is not a fraud-detection verdict.

The accounting engine remains independent from anomaly detection.

---

# External Brokers

Actual trading remains outside Poolfolio.

Potential future integrations may include:

- Groww
- Angel One
- other supported broker APIs

These should be implemented through adapters rather than coupling the accounting engine to one broker.

Poolfolio must never automatically place trades as part of the MVP.