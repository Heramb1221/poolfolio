# Poolfolio Claude Code Multi-Account Guide

## 1. Prepare the repository
Create a GitHub repository named `poolfolio`.
Clone it locally.
Copy the `docs/` and `CLAUDE.md` from this pack into the repository.
Commit them first.

Recommended initial commit:
`docs: establish Poolfolio source of truth`

## 2. Do not run every prompt at once
Use the sequence below.

### Phase A — Bootstrap
Run:
- 00_bootstrap

Only one account is needed.

### Phase B — Parallel foundation
After bootstrap is pushed, run these in separate Git worktrees/branches:
- Account A: 01_backend_1_foundation
- Account B: 06_mobile_1_foundation
- Account C: 09_ai_gemma
- Account D: 11_reports

These tasks have deliberately small contexts.

### Phase C — Backend sequence
Account A runs in order:
02_backend_2_database_auth
03_backend_3_core_modules
04_backend_4_accounting
05_backend_5_transactions_api

Do not start the next backend task until the previous one is committed and pushed.

### Phase D — Mobile sequence
Account B runs:
07_mobile_2_core_ui
08_mobile_3_ai_reports

Mobile may use typed mocks while waiting for backend APIs.

### Phase E — AI
Account C runs:
10_ai_tabpfn

Keep TabPFN behind an adapter. Do not let it block the core application.

### Phase F — Integration
Use a fresh account/session for:
12_integration_qa
13_deploy
14_final_review

## 3. Use Git worktrees for parallel Claude sessions
Claude Code supports isolated worktrees. A typical pattern is:

`claude --worktree backend`
`claude --worktree mobile`
`claude --worktree ai`
`claude --worktree reports`

Each session gets its own branch/worktree. This prevents simultaneous edits from colliding.

Do not let two accounts edit the same files simultaneously.

## 4. Free-tier strategy
Keep prompts short.
Do one bounded task per session.
Do not paste the whole project into Claude.
Let Claude read the relevant docs from the repository.
Commit after each completed task.
Start a fresh session for the next prompt when context becomes large.
Use the repository and docs as persistent memory.

Do not repeatedly ask Claude to explain what it already did. Ask it to inspect the code and execute the next bounded task.

## 5. Merge strategy
For each completed branch:
1. inspect `git diff`
2. run tests/typecheck/build
3. push branch
4. merge into main
5. pull latest main before starting the next dependent task

Merge backend before final integration.
Merge mobile/AI/report branches independently when clean.

## 6. If a Claude session stops because of usage limits
Do not repeat the entire prompt.
Open a fresh session on the same branch and say:

"Read CLAUDE.md and the relevant docs. Inspect the current git diff and existing implementation. Continue the assigned task from the current state. Do not redo completed work."

Then run the same task's remaining acceptance checks.

## 7. If two branches conflict
Do not ask both agents to resolve the conflict.
Choose one integration session.
Give it:
- the two branch names
- the conflict output
- the rule that docs/business rules are authoritative

Have it resolve, test, and commit.

## 8. What you personally should do
You are the final product owner.
Do not spend your limited Claude quota on routine explanations.
Use your own time for:
- reviewing commits
- testing the real user flow
- collecting friend feedback
- preparing the DEV submission
- recording demo evidence

## 9. Critical MVP path
If time becomes short, protect this flow:

Login
→ Group
→ Investment
→ Contributions
→ LOCK
→ Transactions
→ Ownership/P&L
→ Settlement
→ PDF
→ Gemma extraction

TabPFN, Sentry and broker/market integrations are secondary if they threaten the core flow.

## 10. Completion criteria
Poolfolio is demo-ready when a real friend can:
1. register/login
2. join/create a group
3. create an investment
4. enter contributions
5. modify them while OPEN
6. lock the investment
7. see ownership
8. record investment events
9. see P&L/settlement
10. generate a PDF
11. import a document with Gemma and review/confirm extracted data

