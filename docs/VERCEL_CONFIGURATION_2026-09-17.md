# Preview configuration and TypeScript builder alignment — 17 September 2026

Owner reports saving PROFESSOR_PREFLIGHT_KEY and SUPABASE_SERVICE_ROLE_KEY as Vercel Secrets for Preview branch feat/professor-experience-2026-09-13. Values were not requested or inspected. Owner's Supabase screenshot selected v2-development / PREVIEW and masked service_role. Configuration correctness remains subject to runtime verification; the connector cannot list env metadata.

Owner redeployed 667137a28c6ea483fcabddca1660b6a6f795399d: dpl_ADWb2UFHgtLJEGwMnZcsYvcyK4qm is READY, target null, exact feature branch. Build logs nevertheless contain TS5097 (.ts imports) and TS2550 (Object.hasOwn). Application/API checks use dedicated tsconfigs but the root solution config lacked compiler options for Vercel's function compiler.

Root tsconfig now sets ES2022 target/lib and allows and rewrites relative TypeScript import extensions, including emitted builds. No runtime route, permission, admission flag or provider behavior was changed. npm run build (application and API typechecks plus Vite) and git diff --check pass. Existing large-chunk warning remains. Hosted build verification follows publication of this change.

Keep PROFESSOR_ADMISSION_STAGE unset, new bound-start permissions closed and P1 unpublished. No connected SQL, worker deployment, provider calls or production promotion. Owner setup is no longer deferred; secret correctness and authenticated hosted acceptance are not yet proven.
