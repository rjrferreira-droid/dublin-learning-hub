# Voice validation preparation — 13 September 2026

## What was done, and where

The ordinary `v2` alias still points to baseline `5c98fecdc77728a93a563aa949ef8a57bc080613`. Vercel automatically deploys the repair branch as a separate Preview; it was incorrect to equate 'not merged into v2' with 'no preview deployment exists'. The repair preview is:

`https://dublin-learning-hub-git-fix-core-consol-993417-rjrferreira-2878.vercel.app`

Vercel inspection confirmed deployment **dpl_7mQDbUPeVjDZo1kuaUAZFg49Pf9S**, commit **9eae337d2b3a9e5c97c09b6b3a3de176e82b373b**, READY. It is a Preview, not production, and retains Vercel access protection. A protected page fetch returned an SSO redirect; no bypass cookie or share token is copied here. The normal link has not been replaced and PR #2 stays draft.

## Shared Professor UI changes

- Room connection is no longer described as LISTENING before the Professor reports a state.
- The client observes the SDK's `lk.agent.state` participant attribute and renders waiting, preparing session, idle, listening, preparing a response, speaking, reconnecting and unavailable states. Missing, unknown or ambiguous signals are not guessed as listening. This is presentation data, not an identity/authorization check or proof that sound was heard.
- The visual orb is a Professor mark rather than the word AI. The footer still explicitly identifies the product as an **AI voice tutor**; no claim of being a human is introduced.
- A returned session reference and configured duration are visible without exposing the voice token or callback credential.
- Ending the connection no longer implies that evaluation and accounting have already been saved; the UI states that processing may remain outstanding.
- These are common components for Finance, Payroll and English. They do not change the tutor's persona, model, voice, teaching rubric or course content.

## Short validation contract

The API now uses the persisted startup result's validation flag and room name, not just the browser's initial request. This fixes the misleading response case where a server-side validation flag activated validation while the browser sent false.

Validation metadata sent to the worker and returned to the client is capped at **300 seconds**, or the lower configured allowance. Normal session duration and premium policy remain unchanged. The existing worker source already reads the maxSessionSeconds metadata, but actual enforcement by the deployed worker is NOT live-tested by this round. The reservation amount is not reduced based on the shorter requested session and is not represented as a known final cost.

The browser refuses a contradictory validation confirmation before opening its microphone. An explicitly requested validation session presents a checkbox explaining that it is a paid voice session, with transcript/evaluator/cost records retained while learned mastery, Error Bank and spaced review are not updated. It does not call validation 'free' or 'no data stored'. No call begins merely by opening the preview or ticking the box; the Start action is separate.

## Agent packaging

The Dockerfile now copies package-lock.json and uses `npm ci --include=dev`, matching the worker dependencies verified by CI instead of resolving them afresh with npm install. Worker dependency installation/typechecking passed; a fresh container image was not built/deployed to LiveKit in this round. This is not a claim that the entire host image is pinned/reproducible.

## Verification

- **34774532888 — Voice validation preparation: SUCCESS.** Applied the narrow API metadata patch in the isolated CI checkout, built/typechecked the app/API, ran contract and simulated browser regressions and checked the locked worker dependencies. The verified API patch was materialized as **ad0c15abacdf794105f926063ae3f3066bd3bbb7**.
- A new Chromium consent test was committed as **9eae337d2b3a9e5c97c09b6b3a3de176e82b373b**. It uses fictional Auth/REST, blocks external/provider paths, verifies the recording/cost disclosure, checks Start disabled until acknowledgement and verifies returning it to disabled. It never clicks Start or opens real media.
- **34774625423 — final PR CI: build-and-test and professor-agent-typecheck SUCCESS.** Contract, full existing local/simulated-browser regression, new consent test, application/API build and worker typecheck passed on the committed candidate. The manual real-authentication job was intentionally not requested and remains skipped.
- The initial staged PR checks could see the new source assertion before the dedicated workflow materialized the API patch. Acceptance is based on the final committed candidate above, not that intermediate state.

No personal credential reuse, new authentication session, Supabase migration/deployment, learner write, LiveKit dispatch, OpenAI request, raw voice recording, subscription, budget increase, worker deployment or production promotion was performed. Historical SQL archival/security blocks were not retried. A local public-repository clone attempt failed because this container cannot resolve github.com; repository work and tests used the connected GitHub workflow instead.

## Next concrete dependency: confirm the existing LiveKit agent

The repository's `professor-agent/livekit.toml` identifies:

- Project subdomain: **dublin-learning-hub-v2-odgkxtya**.
- Agent ID: **CA_T9kcWtn6Xki7**.
- Source default dispatch name: `learning-hub-professor` (an environment override can change it).

There is no connected LiveKit management action in this conversation; plugin discovery for LiveKit returned no result. These config identifiers are NOT proof of the currently running worker version. The worker fixes from earlier batches remain undeployed/unconfirmed as far as this review can establish.

The next owner input should be the agent's **Overview/Status/version screen** in the LiveKit Cloud project above, or the read-only `lk agent status` output from an already-authorized CLI in professor-agent. Do not request Secrets/API-key values or full transcript logs. First establish the current deployment/version and deployment method, then publish the tested worker through an approved path. Do not create another cloud agent or direct a trial at an unspecified worker simply to unblock the test.

Once the worker is confirmed, the first manually started IFRS18 validation can exercise media, turn-taking, ending, evaluation and cost receipts. That test does not yet establish cross-user RLS, complete historical reconstruction, crash-durable callbacks or outstanding curriculum completeness. The new UI state reporting is an initial experience improvement, not proof of human-level naturalness.

## Primary references reviewed

- LiveKit state reporting: https://docs.livekit.io/frontends/build/agent-state/
- Agent events: https://docs.livekit.io/reference/agents/events/
- Deployment management: https://docs.livekit.io/deploy/agents/managing-deployments/
- CLI status/config identification: https://docs.livekit.io/reference/developer-tools/livekit-cli/agent/
