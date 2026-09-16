# V2 backup evidence and incremental compatibility

## Recovery evidence supplied by the owner

The owner supplied a dashboard screenshot on 16 September 2026 showing:

- Project Dublin Learning Hub; selected branch **v2-development / PREVIEW**.
- URL project ref **aazfyosqqeujureksqjs** (the approved V2 target).
- Database Backups / Scheduled backups, with a **PHYSICAL** backup dated
  **16 Sep 2026 01:00:00 (+0000)** and an available Restore control.
- Earlier physical backups dated 9–15 September are also listed.

This is target-specific dashboard evidence, not a tested restore or a guarantee
against data loss after the backup timestamp. No Restore control was clicked and
no backup was downloaded. Storage object bytes are excluded, as the page states.
The last connected inventory contained zero Storage objects; refresh that count
before any future recovery operation that relies on it.

Evidence file: `62c81d30-8d31-4109-96d0-36cfb8687017.png`, owner attachment.
SHA-256: `e1b530a7b102e07b42b64d3f7948071c8b64707395b4b91e286b97b9a86c561b`.
The image itself is not copied into the public repository because it includes
account/browser information unrelated to the technical evidence.

**The missing V2 backup-list evidence is resolved. Do not ask the owner for this
screenshot or for permission to reuse V2 again.** Earlier checkpoints requesting
it are superseded. Main's separate screenshot was not used as evidence for V2.

## Connected read-only compatibility checks

Source head reviewed: aacf226bca6964ef203dc95306ff071193768df0.
Only digest/boolean metadata was returned; no historical SQL definition exported.

| Routine | Observed MD5 of prosrc |
| --- | --- |
| reserve_professor_budget(text) | 46700844015cb0d4b073e57dba4af019 |
| start_professor_session_atomic(uuid,uuid,text,text,text,boolean) | 789cd691981d0cb4bd38f3457b3ad050 |

A reconstruction from the authored repository migrations did not yield the same
text digests. This does not establish a semantic defect: formatting and other
preserved patches may differ. It does mean that replacing the complete live
routine with a reconstructed file must not be treated as preserving all behavior.

The actual atomic function passed the specific existing candidate patch checks:

- The global-cap expression `held+used+reserve_amount>budget.ai_hard_cap_usd`
  appears exactly once.
- Professor-settings and global-settings row-lock anchors are present.
- The all-period Professor reservation exposure helper is present.
- The Audio pending-hold helper is not already present.

These checks support a narrow future patch that preserves the rest of the live
function. They do not by themselves authorize or prove complete installation:
repeat assertions inside its transaction and retain the reviewed lock order.
The legacy routine still exists, its direct grants remain contained, and the
original Audio installer's legacy-entrypoint guard remains unchanged. It must not
be bypassed by dropping or renaming an unreviewed routine.

## Continuation

Proceed with the existing-V2 incremental budget adaptation, preserving the
unresolved 4 USD reservation and existing rows. Do not install the empty baseline.
No additional backup permission or owner action is needed for the resolved
evidence item. No connected write, paid call, publication or deployment occurred
in this evidence/check tranche. No new application tests were run; the three
successful workflows for aacf226 remain the latest verified implementation.
