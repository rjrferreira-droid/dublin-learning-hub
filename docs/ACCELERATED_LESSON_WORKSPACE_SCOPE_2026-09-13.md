# Accelerated lesson workspace — scope, 13 September 2026

Rafael asked to accelerate further and continue without routine micro-approvals. This batch deliberately combines usable three-course practice and a real conversation-lifecycle correction, rather than merely increasing test counts or expanding the architecture.

## User-facing changes

Nine original application scenarios across Finance, Payroll and English, with 27 structured checks, progressive hints, worked explanations, open-ended reasoning and transfer prompts. They reuse the existing written foundations' scope. Finance categories and payroll deductions are fictional supplied inputs; payroll examples are not current-rate calculators. English checks classify supplied sentences against explicit chronology and do not pretend to grade spontaneous retelling, listening or pronunciation. The original written modules/checkpoints are unchanged.

Local workshop work is retained across study tabs in one open lesson. Switching the workshop scenario explicitly clears only that workshop attempt; closing/reloading/signout discards local work. No local answer or score is persisted, sent to a model, added to the Error Bank or inferred as mastery. New workshop variants are not added to the live teacher packet; the UI states that workshop state is not sent. A discussion of a variant requires the learner to supply its facts in conversation. The default base numeric examples match the already authored written case references.

Inspection found that the former conditional Professor tab unmounted its connection on every tab change. The new workspace mounts only after the first explicit Professor visit, then keeps the SAME session/panel instance within that open lesson. While connecting or connected outside the Professor tab, a visible compact console exposes state, mute, audio recovery and End/Cancel controls. It explains that tab switching and muting do not stop usage. Leaving the lesson, changing course/learner or signing out unmounts and disconnects; no global background call is created. Lesson audio is blocked during an ongoing conversation to avoid competing playback. Existing written drafts and ended-session feedback are retained across tab changes.

Start has a synchronous guard against same-event duplicate clicks. Teardown clears remote audio elements and SDK attachments, cancels stale callbacks and is idempotent across abort/End/unmount. These are client-side safeguards, not a claim of guaranteed server billing reconciliation on lost networks.

## Execution discipline

All changes remain on PR #3 / feat/professor-experience-2026-09-13. No merge to the frozen voice baseline, v2 or main. The worker, API/server reference/budget context, Supabase source, auth identity code and child component/standalone CSS are unchanged. No new dependency/provider/paid test, owner credentials or historical SQL export. Automatic protected feature Preview builds are allowed by the existing development workflow, not a production promotion.

Verification includes existing tests plus pure authored answer keys, real client code bundled with simulated SDK/Auth, actual Chromium journeys across the written/live tabs, no auto-start before Professor visit, single-session counts, course exit, feedback retention, duplicate-click lock, and desktop/mobile workshops. Media/auth/evaluation/storage are fictional, not real acceptance. Success and payload figures must be recorded only after execution and screenshot inspection.

Implementation references checked this execution: React state identity and unmounting (https://react.dev/learn/preserving-and-resetting-state), LiveKit LocalParticipant methods (https://docs.livekit.io/reference/client-sdk-js/classes/LocalParticipant.html), and Playwright assertions (https://playwright.dev/docs/test-assertions). No new regulatory requirement is introduced by these original exercises.
