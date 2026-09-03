# Learning Hub V2 — Minimal Owner Setup Checklist

These are the only account/billing actions that require Rafael. Do not paste private keys, passwords or billing details into ChatGPT.

## 1. Vercel
- Upgrade team `rjrferreira-2878` from Hobby to Pro.
- Open existing project `dublin-learning-hub`.
- Settings -> Git -> connect repository `rjrferreira-droid/dublin-learning-hub`.
- Do not create a duplicate Vercel project.
- Keep production branch as `main` until V2 launch approval.
- Ensure branch `v2` produces Preview deployments, not Production.

## 2. Supabase
- Existing project only: `qwvsrcgsfoguxdbcdrxq` / `Dublin Learning Hub`.
- Upgrade the organisation/project billing to Pro if still Free.
- Do not create another database/project.
- Do not rotate or paste secrets unless explicitly required in the provider dashboard.

## 3. Lovable — optional development accelerator
Current workspace: `Rafael's Lovable`.
Current state detected during V2 preparation: Free workspace with no remaining credits.

If Lovable is approved as a temporary accelerator:
- upgrade/add credits directly in Lovable Billing;
- no new database should be provisioned there;
- Lovable is used primarily for visual/component acceleration;
- source of truth remains GitHub + existing Supabase.

## 4. LiveKit — when Professor build starts
- Create/use a LiveKit Cloud project.
- Start on an appropriate plan; Ship can be enabled for intensive testing/launch if approved.
- API credentials must be stored directly in Vercel/LiveKit environment secrets, never pasted into chat.

## 5. GitHub authenticated smoke-test account
Later, create a dedicated non-personal test learner account (not Rafael/Viviane primary login).
Store credentials directly as GitHub Actions repository secrets:
- `LH_TEST_EMAIL`
- `LH_TEST_PASSWORD`

Never paste the test password into chat.

## Production safety rule
No V2 branch change is promoted to production until automated regression tests and the explicit release gate in `V2_MASTER_BLUEPRINT.md` are green.