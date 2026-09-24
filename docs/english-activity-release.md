# English unit activities — Preview, 24 September 2026

## Delivered

- Language Hub shell: English and Spanish; archived ACCA and Payroll are retained in git and hidden from active navigation.
- Reviewed English Learn pages explain when, why and how, with examples and contrasts. Depth and concept count are per unit.
- Audio questions follow the Learn concepts; transcript starts closed. Existing reviewed audio and spoken answer assessments remain in use. Saved listening feedback can be retrieved.
- Practice merges Grammar and Practice: 10 choices (two attempts, hint after an error) and 10 written answers with explicit submission and AI feedback on grammar, vocabulary, context and clarity.
- Speaking: 20 repeat phrases, explicit recording/submission, acoustic pronunciation assessment only, individual feedback and aggregate pronunciation score.
- Unit evidence: Learn review, listening, all Audio answers, 10 completed choices, 10 assessed written answers and 20 assessed pronunciation phrases. Unassessable answers require another attempt. Completion is practice evidence, not a proficiency certificate.
- Choice attempts and review/listening state sync through the existing account-owned study-state table. Feedback remains private and retrievable for 30 days. Raw learner answer text, audio and transcripts are not separately stored.
- Professor remains the next step. Optional TED before the unit and BBC listening suggestion after completion.

## Backend and budget

Preview Supabase project: `aazfyosqqeujureksqjs`.

`english-activity-assess` resolves authored tasks on the server and checks the authenticated profile. Writing uses `gpt-4.1-mini`; repetition uses audio input to `gpt-audio-1.5`. Existing Audio assessment uses `gpt-audio-1.5`.

All three evaluation features share the existing $8 monthly cap and global $130 AI cap. Each provider request reserves $0.50 atomically. Provider uncertainty retains the hold and prevents an automatic second charge. Settlement and usage receipt are atomic. Service-only RPCs are not callable by ordinary authenticated or anonymous clients.

## Verification

- Application and API TypeScript build.
- Unit contracts for balanced question counts, concept coverage, output validation and profile isolation.
- Runtime tests with fictional services for provider calls, budgets, retries, malformed output, settlement and retrieval.
- Preview transaction proof of shared budget holds, attempt identity, outstanding-item guards, budget rejection and reservation release; all test changes rolled back.
- Browser fixture tests cover desktop/mobile forms, pronunciation recording submission, feedback rendering, history recovery and incomplete-unit gate. These use synthetic service responses, not real pronunciation claims.

## Remaining content/account work

The current ready catalog contains two reviewed units per learner. Producing the complete consolidated grammar curriculum remains a content project; unavailable units stay labelled accordingly. Spanish shares the architecture and remains in preparation.

The Preview currently contains Rafael's account only. Viviane's Practice/Speaking task authorization is implemented and tested with fixtures; her real account, published audio bindings and Professor handoff must be provisioned and verified before her whole path can be declared ready. No new account, invitation or password was created by this change.
