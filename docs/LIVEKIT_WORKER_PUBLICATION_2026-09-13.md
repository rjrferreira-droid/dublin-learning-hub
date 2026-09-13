# Existing V2 worker published and verified — 13 September 2026

## Final verified runtime

| Field | Verified value |
|---|---|
| LiveKit project | dublin-learning-hub-v2-odgkxtya |
| Existing agent | CA_T9kcWtn6Xki7 |
| Dispatch name | learning-hub-professor |
| Deployment / region | production slot of the V2 LiveKit project / us-east |
| Version before this work | L8twNhRUNnHq |
| Final current version | **8V38urC92ToK** |
| Provider status at verification | **Running** |
| Published source commit | **5fef91c111e54d1a3e45b26c4822a9d1133047ff** |
| Provider source attribute | lh_source_commit matches that commit |
| Provider security-patch attribute | lh_sharp_patch=0.35.4 |

The existing V2 worker deployment was genuinely changed. This is not merely a prepared Git branch or a successful typecheck. It does NOT mean the website's main production release, the v2 Git branch or the whole application acceptance was promoted.

The normal V2 branch remains at baseline 5c98fecdc77728a93a563aa949ef8a57bc080613 and PR #2 remains draft. The repair branch has its own automatically deployed, access-protected Vercel Preview. Inspection confirmed that preview READY at deployment dpl_49f3EohHKL9VeDiPxSamgZuA7gGQ, source 7db5ca56328109ed9b05c71dc34bbbd83cbaf684. The latter changes only future workflow triggering relative to the published worker source; the app/worker code is the same.

Short validation entrypoint:

`https://dublin-learning-hub-git-fix-core-consol-993417-rjrferreira-2878.vercel.app/?validation=1`

Vercel access protection is retained; an authorized owner may need to authenticate to Vercel before signing into the Hub. A READY deployment is not proof of an end-to-end voice handshake.

## Sequence and evidence

1. **34775951683, job 103773964787 — remote status SUCCESS.** The previously available project credentials were actually accepted by LiveKit. The specific configured agent and original version L8twNhRUNnHq were verified Sleeping. Only status/version commands were issued; no secrets listing, restart or room request.
2. **34776029763, job 103774180653 — initial reviewed worker update SUCCESS.** Existing app/API/worker typechecks and **102 Node contract tests** passed. The actual worker container was built from the lockfile and typechecked with network disabled, running as node rather than root. One existing-agent deployment produced intermediate version kj6p9S6zpGUw, verified Running and source-tagged to 09e74052713fb95f5db80b21335310922332ad8b.
3. The initial build output reported three high-severity dependency entries. This was noticed and assessed AFTER that first deployment and BEFORE asking the owner to perform a voice trial; it is not retroactively represented as having passed a security audit.
4. **34776332661 — dependency inspection SUCCESS, findings NOT an all-clear.** All three entries trace to one underlying image-library advisory: sharp/libheif, GHSA-rgj7-g3m4-5g8c, affecting sharp below 0.35.4. The SDK packages were counted through the dependency chain. No exploitation or learner-data leak was demonstrated. No npm audit fix --force or SDK downgrade was performed.
5. **34776413522 — targeted security repair SUCCESS.** A scoped override pins @livekit/agents' sharp dependency to **0.35.4**. Assertions preserved all direct dependency declarations AND installed direct versions. The patch was committed as **6458de35a8b3d00962a29bbbfb75b3d9eb055703**. Worker audit/typechecks, synthetic image resize/metadata, native library/libheif version assertions, SDK imports, app build, existing contracts and a container build/import test with network disabled passed. The app, persona, models and teaching source were not modified by this repair.
6. **34776555572, job 103775610908 — security-patched publication SUCCESS.** Installation and `npm audit --audit-level=high` both reported **0 vulnerabilities** for the locked worker dependency graph at that time. The patched container built and native module/SDK imports passed with network disabled. After verifying intermediate version kj6p9S6zpGUw still matched the intended target, one controlled redeployment produced final **8V38urC92ToK**, verified **Running**, with matching source/security attributes. Deployment command exit code 0.

The native image built in the last preflight was sha256:7012dbf46900bd60145d5f91845b0b46fd86da6e0812392abe82bb7efa7b3172. This identifies the CI test image, not a claimed identical remote-provider image digest. LiveKit independently builds the source upload; its version/source attributes are the remote evidence.

A zero npm advisory result is scoped to the current dependency graph/registry snapshot. It does not certify the entire OS, authorization model, storage configuration or application as vulnerability-free. The fluent-ffmpeg deprecation warning remains an upstream maintenance item, not a newly diagnosed exploit.

## Publication safeguards

The official LiveKit CLI **2.18.6** was downloaded and verified against the release SHA256 fa6441e315376a64fcfa173c64ee6c9dcf8bd25d40320aa99b690045832980fe before injecting project credentials. Both publications targeted the existing configured project and agent, required a matching previous runtime version and preserved the current secrets. No create fallback, --secrets, --secrets-file, update-secrets, room, simulation or learner-session command was used. CLI responses containing unrestricted metadata were captured privately; only a whitelisted result was logged.

The new controlled-update workflow is now **manual-only**, with explicit confirmation and an expected-current-version input. It will not publish again on a push/PR. The older pre-existing v2 deployment workflow was not invoked or changed in this operation; its separate release/retirement review remains important before merging this draft.

No installation on the owner's Windows computer, reuse of owner login/password, Supabase migration/deployment, learner-state write, new agent, raw learner recording, voice/model inference session, subscription change or budget increase was performed. Ordinary cloud build/worker infrastructure activity is not claimed universally free. The Manuzinha portal and the existing model/voice/persona configuration were not changed.

## What is now ready, and what is not

The previously missing **worker publication** dependency is resolved. The candidate frontend/API and the updated existing worker are available for a manually started, short IFRS18 validation using the preview, not the old habitual frontend.

That validation is configured to request at most 300 seconds, requires the user's explicit start/consent, incurs normal usage cost, and retains transcript/evaluator/cost records. It is designed not to update learned mastery, Error Bank or spaced reviews. Actual audio, turn-taking, time-limit behavior, completion delivery, evaluation and cost settlement have NOT been exercised by the deployment checks; they are the purpose of the next trial.

No claim is made that naturalness is accepted, a full course is complete, all cross-user RLS cases pass, the blocked historical migration archive is reconstructed, the unresolved old hold is reconciled, or callbacks are crash-durable. Those gates remain documented. The first real trial should use fictional practice examples rather than confidential work information and report its short session reference and observed behavior.

Primary advisory inspected: https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c
Maintainer patch release: https://sharp.pixelplumbing.com/changelog/v0.35.4/
