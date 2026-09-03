# Learning Hub V2 — Master Blueprint

Status: BUILD PREPARATION
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

## 3. Visual identity — fixed

Premium British academic / modern executive product.

Core palette:
- Deep navy: dominant shell/navigation/background.
- British red: primary action and high-priority accents.
- White/off-white: reading surfaces.
- Royal blue: secondary accents.
- Cool greys: neutral hierarchy.

Union-Jack inspiration must be subtle: restrained diagonal/geometric motifs, never literal flag wallpaper or novelty styling. The identity must remain consistent across login, dashboard, lessons, Professor, audio, quizzes, assessments, performance and English Academy.

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
- assessment
- practice
- revision
- performance
- english-academy
- settings

Professor and Audio must be isolated feature boundaries. A voice/audio failure must never clear lesson state or navigate the learner away from the lesson.

### Backend/data
Existing Supabase project remains the source of truth. Do not create a duplicate production database.

Responsibilities:
- authentication
- learner profiles
- courses/modules/lessons
- progress
- questions/cases/visual challenges
- competency scores
- spaced reviews
- AI tutor sessions/turns
- usage/cost logs
- cached audio metadata/assets

### AI
OpenAI responsibilities:
- Realtime Professor intelligence/voice
- premium TTS where used
- independent evaluation
- case feedback
- adaptive content assistance

Tutor and Evaluator must be separate calls/models/contexts.

### Voice
Target: LiveKit + OpenAI Realtime. Do not revive custom browser-to-OpenAI SDP/WebRTC signaling from V1 experiments.

Requirements:
- start/connect
- first audio latency
- learner interruption
- VAD/turn-taking
- reconnect
- graceful stop
- transcript/evaluation handoff
- budget hard stop
- no raw learner voice storage by default

### Deployment
Target pipeline:
GitHub -> Vercel Preview -> Playwright -> approval gate -> Production.

V1 remains frozen until V2 passes launch gates.

## 7. English Academy specification

Approximate curriculum balance, adaptive by learner:
- 35% everyday conversation / diverse general topics
- 20% listening
- 15% grammar and accuracy
- 10% vocabulary, collocations, idioms, phrasal verbs
- 10% professional/business communication
- 10% pronunciation/fluency

Listening exposure target:
- ~40% American
- ~40% British
- ~20% Irish

External material is allowed and encouraged. Copyrighted textbooks such as English Grammar in Use are referenced by unit/page only; Learning Hub creates original exercises and speaking applications rather than copying textbook content.

English modes:
- free conversation
- thematic conversation
- debate
- role-play
- storytelling
- UK session
- US session
- international meeting
- Dublin life
- intensive grammar correction
- delayed correction
- interview/professional
- shadowing/pronunciation

Error Bank examples:
- grammar pattern
- vocabulary/collocation
- pronunciation
- hesitation/fluency
- register/naturalness
- professional concision

## 8. Reliability gates

Minimum automated learner journey:
1. Login.
2. Dashboard loads.
3. Continue Learning opens lesson.
4. Lesson remains open across navigation and background auth refresh.
5. Notes/English/Practice/Case/Test work.
6. Progress persists.
7. Dashboard return works.
8. Reopening lesson restores expected state.

Voice gates before production:
1. Connect succeeds.
2. Professor speaks.
3. Learner speaks.
4. Interruption works.
5. Reconnect works.
6. Stop works.
7. Transcript is captured.
8. Independent evaluation succeeds.
9. Cost is logged.
10. Hard budget stop is respected.

No production release if a critical gate fails.

## 9. Cost strategy

Pay for reliability and learner quality, not unnecessary enterprise complexity.

Expected core:
- Vercel Pro
- Supabase Pro
- OpenAI API usage
- LiveKit (free during light build or Ship when intensive testing/launch warrants it)

Optional only after quality tests:
- ElevenLabs for long-form narration if blind comparison proves a meaningful advantage
- specialised pronunciation provider for objective pronunciation assessment

Keep GitHub, GitHub Actions, Playwright and error monitoring on free tiers while sufficient.

## 10. Build order

Phase A — foundation
- freeze V1
- V2 branch/environment
- design system
- routing/state boundaries
- Supabase client/auth/data adapters
- Vercel preview pipeline
- Playwright critical flow

Phase B — core learning engine
- dashboard
- lessons
- progress
- spaced review
- competency model
- Error Bank
- assessments

Phase C — premium AI
- cached Premium Audio
- Professor LiveKit/OpenAI
- independent Evaluator
- case feedback
- cost controls

Phase D — Golden Lessons
- Finance
- Payroll
- English
- complete end-to-end validation

Phase E — scale curriculum
- 4–8 weeks ahead rather than bulk-generating all 24 months
- adapt based on real scores and error history

## 11. Definition of done for V2 launch

V2 can replace V1 only when:
- all critical Playwright flows pass
- no known navigation/auth regression exists
- all three Golden Lessons pass end-to-end
- Premium Audio is stable and cached
- Professor passes the voice gates
- Evaluator and cost logging work
- mobile and desktop journeys are usable
- British visual system is consistent
- learner data is preserved
- rollback path is confirmed

Until then, `main`/V1 is not used as an experimental branch.