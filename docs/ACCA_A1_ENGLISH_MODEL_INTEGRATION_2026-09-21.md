# ACCA A1 and contextual English model integration — 21 September 2026

## Result

- ACCA FR A1 is a complete local model lesson using the existing written-learning experience.
- It is exposed only when authenticated Preview is opened with `?curriculumPreview=1`.
- The library labels it **Model · local**; the lesson labels itself **Local preview · no providers**.
- Exact ID and slug must both match before the lazy loader imports the module.
- “Tell a story naturally” remains the existing English Golden Lesson and now has three lesson-specific contextual grammar exercises instead of the generic track fallback.

## Deliberate exclusions

The ACCA model does not mount Professor, Premium Audio, readiness/admission, persistence or a database publication record. Its Professor guide and podcast are offline authored references only. Local drafts and answer-key checks remain inside the open lesson and disappear when it closes.

No Supabase file, migration, Edge Function, worker, deployment workflow, Premium Audio runtime, asset, cache or budget control is changed.

## Acceptance

Static contracts cover identity, explicit Preview gating, lesson structure, sitting-specific syllabus gating, contextual English practice and provider-free boundaries. Browser acceptance covers desktop/mobile navigation, local practice and closed Audio/Professor surfaces with sensitive requests blocked.
