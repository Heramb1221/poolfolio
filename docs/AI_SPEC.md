# Poolfolio AI Specification

## Principle
AI assists the application; deterministic accounting remains authoritative.

## Gemma: document extraction
Flow:
upload document
→ preprocessing/OCR if required
→ Gemma
→ structured extraction
→ schema validation
→ user review
→ confirmation
→ ledger write

Gemma may extract:
- investment name
- member
- amount
- transaction type
- date
- quantity
- price
- reference

AI output must never directly become financial truth.

## Gemma: explanation
Backend calculates exact figures first.
Gemma receives verified values and explains them in plain language.
Gemma must not calculate ownership/P&L itself.

## TabPFN
Use historical transaction data to identify unusual patterns.
Example features:
- contribution amount
- transaction amount
- member frequency
- amount deviation
- transaction type frequency
- timing features

Output should be an anomaly score/flag and supporting features.
It is a detection aid, not a fraud verdict.

## Validation
All extracted numeric values must be parsed and validated.
Unknown members, invalid dates, negative values where invalid, and impossible transaction states must be rejected or sent for correction.

## MVP
Use Gemma as the primary open-source AI feature.
Use TabPFN if integration is stable within the challenge deadline.
