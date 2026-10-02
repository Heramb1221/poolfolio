# Poolfolio Integration Rules

## Ownership of files
Backend owns server core/accounting/prisma.
Mobile owns mobile/.
AI owns server/src/modules/ai/.
Reports owns server/src/modules/reports/.

Do not modify another team's module during parallel work.

## Integration order
1. Backend contracts/schema
2. Mobile consumes contracts
3. AI integrates with backend
4. Reports consumes accounting services
5. Integration/QA connects everything

## Merge rule
Before merging:
- pull/rebase latest main
- inspect diff
- run tests/typecheck/build
- resolve conflicts manually
- verify no business rule changed

## Definition of done
A task is complete only when:
- code exists
- relevant tests pass
- typecheck/build passes
- no unrelated files changed
- status is updated
- commit message describes the change
