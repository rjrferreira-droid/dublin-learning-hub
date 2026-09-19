# Atomic Audio continuation — 2026-09-14

Status: feature-branch candidate only; no connected Supabase write, migration or Edge deployment, no paid provider invocation. PR #3 stays draft on the frozen core base. LiveKit remains nb67ioJmoKBN.

## Implemented boundary

The isolated stage is now explicitly `P1_AUDIO_RUNTIME_STAGE=isolated-preview-atomic-v2`. It must remain unset on the connected backend. When deliberately installed in an isolated backend, this stage routes all uncached Audio, including Golden lessons, through the atomic contract. P1 remains default-closed. The client still blocks P1 interactive providers pending deployment/publication acceptance.

The SQL candidate lives under quality/candidates, outside deployable migrations. Admission locks the Professor settings row and then global settings, in the same order as the reviewed Professor start. Global admission accounts for logged usage, all-period Professor reservations and all-period pending Audio; Premium Audio separately checks its bucket. The candidate patches the exact known Professor start expression to include pending Audio. A legacy reserve_professor_budget(text) entry point or source drift aborts installation; this is a real deployment blocker, not an invitation to bypass historical SQL controls.

An attempt moves reserved → submitted → settled. Only never-submitted expired reservations are reclaimable. A provider timeout, failed storage or lost submission/receipt acknowledgement preserves an uncertain obligation. Acknowledged one-shot submission is required before calling the provider. Settlement records one idempotent application-estimated receipt transactionally; a receipt failure retains the hold. Replaying an attempt never authorizes a second provider call.

The shared Edge orchestration rechecks lesson/version after admission, detects cache races and refuses orphan objects before submission. Storage refuses overwriting an existing object. Asset metadata contains the attempt ID for reconciliation; a cache read can settle that exact durable receipt without generating again. Missing metadata is not fabricated. User error policies do not suggest regenerating after uncertain outcomes.

## Evidence

Commit a4e9869fd5685f02acb9401cae46d0066d1b01bc:
- Disposable PostgreSQL 17 concurrency CI: https://github.com/rjrferreira-droid/dublin-learning-hub/actions/runs/34861301005 — passed all 12 scenarios.
- Full feature CI: https://github.com/rjrferreira-droid/dublin-learning-hub/actions/runs/34861300911 — passed.
- Real concurrent admissions included different lessons and Audio versus Professor in both launch orders, all-period uncertainty, safe lease expiry, concurrent settlement, transactional receipt rollback, identity/version fences and denied roles.

Current orchestration changes:
- Local: 365 Node contracts, 43 handler integrations, production build passed.
- Commit 12a69fd8ca53bf20863b65f6e32fd00d708d2151: atomic CI https://github.com/rjrferreira-droid/dublin-learning-hub/actions/runs/34862475821 passed all 12 SQL scenarios and five PostgreSQL-plus-orchestration scenarios with fictional provider/storage, including lost database acknowledgements.
- Full CI on that commit caught one outdated browser-suite service expectation (retryable=true after uncertain provider/storage failure); 109 other browser cases passed. The follow-up aligns that expectation with the reviewed non-retryable policy. Use the follow-up commit CI for complete browser acceptance.
- Full browser regression is the Professor workflow on the current commit. No hosted authenticated P1 provider flow is claimed.

## Remaining activation requirements

Review actual isolated-backend RPC inventory and every charge-producing admission entry point before installing the candidate. The strict legacy guard deliberately prevents applying this patch blindly. Application estimates and holds are not provider invoices or proof of an absolute real-cost cap.

Prepare operator reconciliation for uncertain attempts with provider/storage evidence; do not automatically cancel them on age or retry the provider. Authentication-protected Preview acceptance and unpublished lesson identity verification remain outstanding. Actual lesson publication, connected backend installation, worker deployment and production promotion require a separate decision; none was performed here.
