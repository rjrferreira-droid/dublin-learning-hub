# Written reference bridge and mobile reading — scope, 13 September 2026

User approved continuing PR #3 to connect the written content with the Professor and address mobile utility overlap. This increment is confined to feat/professor-experience-2026-09-13. It does not modify/merge the ready-for-voice baseline, ordinary V2, main, Supabase or the published worker. The normal Vercel integration may publish this candidate as its separate protected Preview; that is not an agent deployment or a real voice test.

## Server-selected common reference

The existing API authenticates the user, checks requested track/identity, reads lesson/course information and resolves the persisted lesson. Only then does the new adapter select the matching SERVER-IMPORTED written module and companion, before the budget reservation/dispatch step. Extra client lesson content, drafts or scores are ignored. Unknown unrelated lesson IDs retain the previous context path; cross-account tracks fail. An oversized or mismatched authored packet fails before reservation, without silently chopping assumptions or scope.

The common technicalBrief contains the module's scope, all teaching paragraphs, authored case facts, model reference and criteria, plus official source links/review dates. Both the current worker's lesson guidance and the current evaluator's context assembly already read that field. This deliberately avoids a bug where only workedExample/practiceScenario would be updated but the current evaluator would never see them. No worker or scoring rubric change is required for compatibility.

Reference model answers are labeled as AUTHORING material, not learner speech. The packet explicitly does not assert that the learner read the lesson, did the exercises or obtained any score. Local drafts and fixed-answer results stay local. Pronunciation/real-time oral performance cannot be inferred from the written packet. The checksum/version identify authored content, not mastery or provider-verified delivery.

The adapter bounds total serialized reference size at 24,000 UTF-8 bytes and shared-brief length at 14,000 characters. These are payload limits, NOT token counts or cost guarantees. Existing model, time and spending limits remain unchanged. Future paid-session consumption still depends on the model/session; this increment runs no paid calls.

## Mobile utilities

Only below 761px and inside .auth-app, existing Memory/Cost utility launchers, signout and the child-portal entry button are placed in normal document flow above the adult workspace. They scroll away instead of floating over reading and exercises. Open utility panels expand to full available width with bounded scrolling. Desktop retains its previous layout.

The child entry button's position in the adult shell changes as part of the utility layout; child component code, overlay, voice, data and standalone route do not change. The standalone portal has no .auth-app ancestor and must not acquire adult utilities or styling. This is not a wholesale navigation redesign or a claim that every real mobile keyboard/browser has been tested.

## Planned evidence

Contract tests, executable candidate API and unchanged evaluator assembly with mocked SDK/auth/data and a fake model response, followed by actual Chromium geometry/navigation tests with fictional Auth/REST and external providers blocked. No credentials or model keys are retrieved; synthetic strings in the harness are not usable provider credentials. No real database records, voice or student data are created. Source and screenshot evidence must be recorded only after runs finish.

The API exercise can establish matching content in dispatch metadata and the evaluator request. It cannot establish that a real model follows the instructions or that the published agent completed a voice session. Real voice acceptance remains pending and separate.

References reviewed for implementation: MDN env()/safe-area variables (https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env), React state preservation (https://react.dev/learn/preserving-and-resetting-state) and Playwright request mocking (https://playwright.dev/docs/mock). No new regulatory or course-content claim is introduced in this bridge.
