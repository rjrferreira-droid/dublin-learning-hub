# Premium Audio: immutable attempt and receipt

During the V2 adaptation review, the shared Audio orchestrator was found to retain
the caller-owned input object across asynchronous admission, preparation,
generation, storage and settlement. A caller mutation could redirect subsequent
RPC arguments, change recorded cost/character values, or close the wrong attempt
after a failure. This was a candidate-source flaw; no connected exploit or lost
data is claimed.

The orchestrator now captures only the seven reviewed scalar request fields before
the first asynchronous operation. Validation, admission, storage identity,
settlement and failure cleanup all use that frozen snapshot. The storage response
is copied into a frozen two-field result before awaiting settlement, preventing
late mutation or extra provider fields from escaping through the returned asset.
Injected provider/storage callbacks remain trusted server code; this change does
not attest arbitrary provider output or make mutable callback closures safe.

Six additional Node cases cover mutation during admission, preparation, generation
and storage; uncertain cleanup after mutation; and modification/extra fields on a
storage receipt during settlement. All 18 focused tests passed locally. Two added
real PostgreSQL scenarios exercise the original receipt and original uncertain
hold, with replay denial, using only fictional providers. See this commit's
`Isolated Premium Audio atomic budget candidate` and full Professor workflows for
their authoritative CI verdicts; local Node success alone is not SQL acceptance.

The V2 containment from the prior checkpoint remains applied. No additional
connected database write, Edge deployment, paid provider call, P1 publication,
worker update or main/V2 application promotion is part of this fix. The atomic SQL
legacy guard remains unchanged, and the shared Edge candidate remains undeployed.
Incremental backend compatibility, target-specific recovery evidence and hosted
Preview activation remain separate work.
