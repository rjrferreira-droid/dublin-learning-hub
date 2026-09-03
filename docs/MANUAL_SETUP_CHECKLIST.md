# Learning Hub V2 — Minimal Owner Setup Checklist

These are the only account/billing actions that require Rafael. Do not paste private keys, passwords or billing details into ChatGPT.

## 1. Vercel
- [x] Upgrade team `rjrferreira-2878` from Hobby to Pro.
- [x] Open existing project `dublin-learning-hub`.
- [x] Settings -> Git -> connect repository `rjrferreira-droid/dublin-learning-hub`.
- [x] Do not create a duplicate Vercel project.
- [x] Keep production isolated from the V2 working branch until launch approval.
- [x] Confirm branch `v2` produces Preview deployments, not Production.

## 2. Supabase
- Existing project only: `qwvsrcgsfoguxdbcdrxq` / `Dublin Learning Hub`.
- Upgrade the organisation/project billing to Pro if still Free.
- Do not create another database/project.
- Do not rotate or paste secrets unless explicitly required in the provider dashboard.

## 3. Lovable — development accelerator
- [x] Workspace `Rafael's Lovable` upgraded to Pro.
- [x] Create an isolated visual-only V2 design prototype using mock data.
- [x] Confirm no Lovable/Supabase database is enabled for the visual prototype.
- [x] Keep GitHub + existing Supabase as the source of truth.
- Lovable is used for visual/component acceleration only; approved patterns are ported into the real `v2` branch.

## 4. ChatGPT Pro — intensive build sprint
- [x] Pro enabled for the intensive V2 development period.
- Purpose: reduce interruption during larger architecture, code, testing and review sessions.
- This subscription does not replace OpenAI API billing used by the Learning Hub itself.

## 5. LiveKit — when Professor build starts
- Create/use a LiveKit Cloud project.
- Start on an appropriate plan; Ship can be enabled for intensive testing/launch if approved.
- API credentials must be stored directly in Vercel/LiveKit environment secrets, never pasted into chat.

## 6. GitHub authenticated smoke-test account
Later, create a dedicated non-personal test learner account (not Rafael/Viviane primary login).
Store credentials directly as GitHub Actions repository secrets:
- `LH_TEST_EMAIL`
- `LH_TEST_PASSWORD`

Never paste the test password into chat.

## Production safety rule
No V2 branch change is promoted to production until automated regression tests and the explicit release gate in `V2_MASTER_BLUEPRINT.md` are green.
