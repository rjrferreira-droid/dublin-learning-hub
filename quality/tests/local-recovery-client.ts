// Acceptance bundle only, emitted into disposable dist after the application
// build. Never imported by the application or shipped by normal Vercel builds.
export {createClient} from '@supabase/supabase-js';
export {createProfessorRecoveryController} from '../candidates/professor-recovery-controller.ts';
