# AI 1 — Gemma Extraction

You own server/src/modules/ai/.

Read:
CLAUDE.md
docs/AI_SPEC.md
docs/API_CONTRACT.md

Implement the smallest reliable Gemma pipeline:
document input
→ preprocessing/OCR boundary
→ Gemma
→ structured JSON
→ schema validation
→ stored AIExtraction

Support broker statement / transaction note / IPO allotment information.

Do not write directly to Contribution or Transaction.
Return proposed extraction for confirmation.

Prefer a simple local/open-weight integration suitable for the challenge.
Document required environment variables.
Add tests using mocked model responses.

Commit only AI module changes.
