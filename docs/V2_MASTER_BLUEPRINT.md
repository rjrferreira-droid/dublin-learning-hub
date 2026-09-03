# Learning Hub V2 — Master Blueprint

Status: ACTIVE BUILD SPRINT — started 2026-09-03
Owner: Rafael Ferreira
Target: premium private learning platform for Rafael and Viviane, Dublin 2028/29 preparation.

## 1. Product decision

V1 is frozen. No requirement to keep an interim study version working while V2 is built.

Frozen reference branch: `v1-frozen-2026-09-03`
V2 working branch: `v2`

Production promotion rule: V2 does not replace V1 until regression, AI/voice and learner-journey gates pass.

## 2. Product tracks

### Rafael — Finance Ireland
Corporate/industry destination only. Financial Controller, Senior Finance Manager, Regional Finance Manager, Commercial Finance, Senior Finance Business Partner and Finance Transformation. Exclude audit/consulting as destination paths. Curriculum: IFRS/ACCA, Irish statutory reporting, Irish finance/tax, treasury, FP&A, governance, SAP/finance transformation, leadership, business partnering and Dublin interview readiness.

### Viviane — Irish Payroll
Irish Payroll / Payroll Specialist / HR Operations. PAYE, USC, PRSI, Revenue, RPN, payroll lifecycle, controls, systems, employment/payroll rules, multinational payroll operations, professional English and interview readiness.

### English Academy
Full general + professional English. Not a Business-English-only course. British and American English mix, with deliberate Irish exposure. Everyday conversation, listening, reading, grammar, writing, vocabulary, pronunciation, storytelling, debate, role-play, professional communication and real-world Dublin scenarios. Accept UK and US variants and teach the distinction. UK/Irish conventions may be preferred for professional Dublin writing.

Target exposure mix for listening and real-world English: approximately 40% British, 40% American and 20% Irish, adjusted by learner needs and relocation context.

## 3. Visual identity — fixed

Premium British academic / modern executive product.

Core palette:
- Deep navy: dominant shell/navigation/background.
- British red: primary action and high-priority accents.
- White/off-white: reading surfaces.
- Royal blue: secondary accents.
- Cool greys: neutral hierarchy.

Union-Jack inspiration must be subtle: restrained diagonal/geometric motifs, never literal flag wallpaper or novelty styling. The identity must remain consistent across login, dashboard, lessons, Professor, audio, quizzes, assessments, performance and English Academy.

Visual acceleration workflow:
- Lovable Pro is used only as an isolated design/component studio with mock data.
- No Lovable database/backend is used for the real product.
- Best patterns are selectively ported to the real React `v2` branch.
- GitHub + existing Supabase remain the source of truth.

## 4. Pedagogy architecture

Every study unit is active, not passive. Standard loop:

Learn -> Retrieve -> Apply -> Speak/Write -> Evaluate -> Retry -> Schedule Review.

Core engines:
- Tutor: teaches, asks follow-ups, explains and converses.
- Evaluator: independent scoring; does not participate in the live conversation.
- Curriculum Engine: decides what reappears based on performance and review timing.
- Error Bank: recurring technical/language errors, with mastery decay/recovery.
- Spaced Review: D+1 / D+7 / D+30 / D+90.

Any competency below 70% becomes a priority for the following period.

## 5. Golden Lesson strategy

Do not bulk-produce 104 weeks before the engine is validated. First build exactly three end-to-end Golden Lessons:

1. Finance Golden Lesson — Rafael.
2. Irish Payroll Golden Lesson — Viviane.
3. General English Golden Lesson — learner-adaptive.

Each must prove the full journey:

Dashboard -> Lesson -> Learn/Notes -> Premium Audio -> English -> Practice -> Visual -> Case -> Test -> Professor -> Independent Evaluation -> Progress -> Spaced Review -> Performance.

Only after these three are excellent should curriculum production scale.

## 6. Technical architecture

### Frontend
Target: React + TypeScript, modular feature boundaries, responsive/mobile-first, accessibility-first.

Recommended feature modules:
- auth
- dashboard
- learning
- lesson
- audio
- professor
- evaluation
- error-bank
- revision
- performance
- english-academy
- settings

### Backend
Reuse the existing Supabase project `qwvsrcgsfoguxdbcdrxq`.

Do not create a second database merely to support V2.

Existing useful domains include profiles, courses/modules/lessons, questions/cases, progress, competencies, spaced reviews, monthly challenges, AI tutor sessions/turns, AI usage and budget controls.

### AI
- Premium Audio: existing `premium-lesson-audio` Edge Function is reusable.
- Independent evaluator: existing `ai-tutor-evaluate` backend is reusable and will evolve toward stricter blind/independent assessment.
- Professor: new production target is LiveKit + OpenAI Realtime. Do not revive the old custom browser-SDP signaling architecture.
- Default privacy: do not store raw learner voice unless later explicitly approved; persist transcript/evaluation where pedagogically necessary.

### Environments
- V1 production: frozen.
- V2 development: `v2` branch.
- Vercel Preview: automatic from `v2` and future feature branches.
- Production promotion: explicit approval only.

## 7. Release gates

A feature is not complete merely because it renders.

Required gates before V2 production:
1. TypeScript/build green.
2. Playwright smoke/regression suite green.
3. Authenticated learner journey green using a dedicated test learner.
4. Lesson navigation remains stable during token refresh/background auth events.
5. Premium Audio works, caches and respects AI budget hard-stop.
6. Professor passes connect / first audio / interruption / reconnect / stop / evaluation tests.
7. Error Bank and spaced-review writes verified.
8. Finance, Payroll and English Golden Lessons each complete end-to-end.
9. Desktop and mobile visual QA.
10. Rafael approves the release candidate.

## 8. Build sequence

### Sprint A — Foundation
- stable React shell and design system
- Supabase auth/session boundary
- routing/state ownership
- feature flags
- dashboard/academy/lesson shells
- automated tests

### Sprint B — Adaptive learning engine
- progress contract
- competency evidence
- spaced reviews
- Error Bank
- curriculum priority rules (<70% and recurring errors)
- assessment/result surfaces

### Sprint C — Premium AI
- Premium Audio in real V2
- Professor LiveKit token/session architecture
- OpenAI Realtime conversation
- evaluator/result pipeline
- AI spend telemetry and hard stops

### Sprint D — Golden Lessons
- Finance Golden Lesson
- Payroll Golden Lesson
- General English Golden Lesson
- complete learner journeys and QA

### Sprint E — English Academy
- placement / CEFR profile
- General English core
- UK + US + Irish exposure
- listening / reading / grammar / vocabulary / speaking / writing / pronunciation
- external assignment model without copying proprietary content
- Professor conversation modes
- Error Bank adaptation

### Sprint F — polish and release candidate
- accessibility
- mobile/responsive
- observability
- backup/rollback validation
- learner acceptance

## 9. Current sprint state — 2026-09-03

Completed prerequisites:
- V1 frozen and V2 isolated.
- Vercel Pro active and existing Vercel project connected to `rjrferreira-droid/dublin-learning-hub`.
- `v2` confirmed to generate Preview rather than Production deployment.
- GitHub Actions + Playwright V2 pipeline established and previously green.
- Lovable Pro enabled; isolated British Premium visual prototype created with mock data only and no database enabled.
- ChatGPT Pro enabled for the intensive development period.
- Existing Supabase, Premium Audio and independent evaluator contracts are already available for reuse.

Next owner intervention is intentionally deferred until LiveKit/account credentials or a dedicated authenticated test learner are required. Secrets are never pasted into chat.
