# Written lesson loading recovery

Deferred written lessons now distinguish an absent reviewed module from a failed or stalled download. Loading is bounded to 15 seconds. Failure shows a generic connection message and explicit “Try loading again” action, without page reload or automatic retry. Native module imports cannot be forcibly cancelled; late completion is discarded. Retrying a browser-cached import error may still fail, and this implementation deliberately does not cache-bust or silently reload the page.

Loader validates the returned lesson ID and track. UI state is scoped to track/ID/slug plus attempt, so previous content cannot render for a newly selected scope even before effect cleanup. Unmount aborts waiting. Loaded study content is unchanged; normal tab switching preserves open-lesson drafts. No persistence, mastery, pronunciation evidence, provider admission or lesson publication is introduced.

Local validation: 587 Node contracts and build/API typecheck passed. Five new tests cover missing versus transport failure, identity mismatch, deadline/late completion/no retry, cancellation/fresh explicit load and pre-cancelled work. New mobile browser acceptance stalls the P1 module download, observes timeout, manually resumes, then checks written draft continuity and zero provider requests. Matching CI supplies the browser verdict.

Independent of deferred Vercel setup. Connected V2 data/grants, closed new admission and unpublished P1 remain unchanged.
