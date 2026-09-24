# Curriculum default on the isolated Preview

The reviewed ACCA and English curriculum is enabled automatically only when Vercel builds the exact branch `feat/professor-experience-2026-09-13` as a Preview deployment.

- The normal branch Preview URL no longer needs `?curriculumPreview=1`.
- `?curriculumPreview=0` remains an explicit diagnostic opt-out.
- `?curriculumPreview=1` remains an explicit local diagnostic opt-in.
- Production, local builds without the opt-in, and Preview builds from other branches remain closed.
- The gate uses Vercel build system variables. It adds no public environment variable, secret, provider, database migration, or paid service.

The root HTML element exposes `data-curriculum-preview="enabled|disabled"` so the deployed build mode can be verified at the login screen without using a learner account.
