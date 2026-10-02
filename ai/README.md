# Poolfolio AI Services

AI and Machine Learning components supporting document extraction and transaction anomaly detection for Poolfolio.

## Responsibilities

1. **Document & Statement Extraction (Gemma):**
   - Extract structured transaction data from broker statements, contract notes, and IPO allotment notices (PDF/images).
   - Normalize dates, quantities, prices, fees, and transaction types.
   - Return structured JSON with associated extraction confidence metrics.

2. **Anomaly Detection (TabPFN):**
   - Inspect historical transaction features to flag anomalous entries (e.g., unexpected fee spikes, unusual pricing outliers).
   - Serve as an advisory mechanism for leaders and members reviewing activity.

## AI Safety & Architecture Boundary

- **Human-in-the-Loop:** AI extraction is strictly an ingestion aid. Extracted data MUST be reviewed and explicitly confirmed by a human user before any record is committed to the financial ledger.
- **Never Determine Financial Truth:** AI models MUST NEVER independently calculate or decide:
  - Ownership percentages
  - P&L allocations
  - Settlement balances
- **Advisory Flagging:** TabPFN anomaly detection flags items for review; it does not render fraud verdicts or block transactions automatically.
