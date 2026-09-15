import { resolveP1ProfessorHandoff, type P1RequestTrack } from './p1-professor-handoff.ts';

export const P1_PREVIEW_BRANCH = 'feat/professor-experience-2026-09-13';

/** Only the feature Preview may resolve P1. This never opens publication or provider gates. */
export function isP1FeaturePreview(env: Record<string, string | undefined>) {
  return env.VERCEL_ENV === 'preview' && env.VERCEL_GIT_COMMIT_REF === P1_PREVIEW_BRANCH;
}

/** Caller supplies the authenticated user's client, never a privileged or browser-resolved row. */
export async function resolvePreviewP1Lesson(db: any, input: {
  profileTrack: unknown; requestedTrack: P1RequestTrack; requestedLessonId: string;
  approachBrief: string;
}, env: Record<string, string | undefined>) {
  if (!isP1FeaturePreview(env)) throw new Error('p1_preview_runtime_unavailable');
  const { data: lesson, error: lessonError } = await db.from('lessons')
    .select('id,module_id,slug,is_published').eq('id', input.requestedLessonId)
    .eq('is_published', true).maybeSingle();
  if (lessonError || !lesson?.module_id || lesson.is_published !== true) throw new Error('professor_lesson_forbidden');
  const { data: module, error: moduleError } = await db.from('modules')
    .select('id,course_id,is_published').eq('id', lesson.module_id)
    .eq('is_published', true).maybeSingle();
  if (moduleError || module?.id !== lesson.module_id || !module?.course_id || module.is_published !== true) throw new Error('professor_lesson_forbidden');
  const { data: course, error: courseError } = await db.from('courses')
    .select('id,learner_track,is_active').eq('id', module.course_id)
    .eq('is_active', true).maybeSingle();
  if (courseError || course?.id !== module.course_id || course?.is_active !== true) throw new Error('professor_lesson_forbidden');
  return resolveP1ProfessorHandoff({ ...input, resolvedLesson: {
    id: lesson.id, slug: lesson.slug, learnerTrack: course.learner_track, isPublished: lesson.is_published,
  } });
}
