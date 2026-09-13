# Runtime recovery snapshot — V2 development, 13 September 2026

This directory preserves source recovered by authenticated read-only inspection of the **existing V2 development** Edge Functions. It contains application source, not user records, passwords, transcript exports or raw learner audio.

`edge/` is an inert historical archive. Do not deploy it in bulk. The current candidates are under `supabase/functions/`; some will intentionally diverge after reviewed repairs. The manifest records provider bundle fingerprints separately from Git blob fingerprints; these hashes measure different objects and must not be compared to each other.

All nine active Edge Function slugs are represented. This closes the missing **Edge Function source** inventory, not the entire infrastructure-recovery task. Database migration restoration, provider secrets, storage object backups, Auth configuration and the running LiveKit worker are separate release gates.

The old browser tutor/session/evaluator and WebRTC signaling sources are preserved for dependency review and rollback, not reintroduced as the target Professor architecture. The old routes have known budget/evidence limitations. The targeted boundary repair prevents them from mutating managed LiveKit Professor sessions.

No database migration from this archive should be replayed against an existing environment merely because a source file was missing in Git. Read the migration inventory and reconcile versions first.
