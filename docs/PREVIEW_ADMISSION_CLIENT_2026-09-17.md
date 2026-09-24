# Preview admission client checkpoint

Owner screenshot on 17 September shows configuration_verified for the signed-in Rafael account. This resolves the server credential and in-memory encryption check, not session or provider acceptance. Both configuration-head workflows 35244176407 and 35244176504 completed successfully at 0ffdc6c.

The browser-safe adapter in src/professor/previewAdmission.ts now connects the shared admission route's preflight and start contracts. It captures the catalog selection, validates the complete returned identity and content version, rechecks the current session before start and after its response, sends only explicit identity fields, and validates the acknowledgement against the captured reference. It never dispatches a provider or sends drafts/answers.

Each controller permits one attempt. Cancellation and a 15-second deadline settle even if a dependency ignores abort. After start submission, loss, timeout, account change or invalid acknowledgement remains unconfirmed with reservationMayExist=true; no retry or release is attempted. Callers must dispose on account/selection changes, including away-and-back changes, and unmount. No controller is persisted across reloads.

Nine focused tests passed, including interoperability with the actual shared route and bound admission code using fictional Auth/storage/RPC dependencies. This is not connected SQL or paid provider acceptance. Application/API build passed. Existing disposable SQL acceptance remains separate evidence.

The adapter is intentionally not mounted into the session UI yet. Mounting requires a durable recovery path across navigation/reload and reviewed activation. PROFESSOR_ADMISSION_STAGE stays unset, connected bound-start grants stay closed, and P1 remains unpublished. A positive admission can reserve money even without provider dispatch. No connected writes, new worker, production promotion, paid calls or credential changes occurred.

Next: connect admission acknowledgement and read-only recovery to a session UI against disposable infrastructure; only then review connected activation and a separately budgeted voice/Audio acceptance run. The current UI and hosted configuration diagnostic remain unchanged.
