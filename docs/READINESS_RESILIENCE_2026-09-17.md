# Provider-free readiness failure recovery

The explicit P1 availability check now has a 15-second deadline covering initial Auth, fetch, response decoding and final Auth. External cancellation settles even when an underlying dependency never resolves. Cleanup aborts fetch, clears the timer and removes the listener. Every await boundary checks cancellation, so late Auth/network/body results cannot trigger later work or replace the unavailable result. The caller's signal is not aborted on internal timeout: the mounted UI can leave “Checking” and show its existing generic unavailable state.

No automatic retry is introduced. A user may explicitly repeat this read-only check; this never grants session, voice or Audio admission. Written study remains available, and payload still contains only lesson ID/track.

Local: 582 Node contracts and full build passed. Six new unit cases cover each stalled phase, late completion with no further calls, external cancellation and already-cancelled requests. The existing Finance mobile P1 browser case additionally stalls the endpoint, advances the clock, checks the recovered button/no automatic retry, then explicitly rechecks successfully while all provider panels remain closed. Use matching CI for browser results.

This work does not depend on private Vercel configuration. No connected SQL, permissions, publication, worker or paid call changed. User has deferred dashboard configuration during a busy week; do not repeatedly request screenshots/approval while safe implementation work remains.
