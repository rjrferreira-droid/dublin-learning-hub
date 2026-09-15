// One-time candidate-only wiring. Never targets or modifies the ready-for-voice branch.
import fs from 'node:fs';
if (process.env.GITHUB_REF_NAME !== 'feat/professor-experience-2026-09-13') throw new Error('wrong_branch');
function edit(path, before, after) {
  const text = fs.readFileSync(path, 'utf8');
  if (text.includes(after)) return;
  if (text.split(before).length !== 2) throw new Error(`bridge_anchor_not_unique: ${path}`);
  fs.writeFileSync(path, text.replace(before, after));
}
const api = 'api/livekit-token.ts';
edit(api, "import { voiceValidationPlan } from '../server/voice-validation.js';", "import { voiceValidationPlan } from '../server/voice-validation.js';\nimport { buildWrittenLessonContext } from '../server/written-lesson-context.js';\nimport { LESSON_MODULES } from '../src/learning/lessonModules.js';\nimport { STUDY_PACKS } from '../src/learning/teachingPacks.js';");
const anchor = "  if (!persistenceLessonId) return send(res, 503, { error: 'professor_session_persistence_unavailable' });";
edit(api, anchor, anchor + `

  // Choose authored content only after authenticated track/lesson resolution and BEFORE reserving.
  // Browser-supplied lessonContext, answers and drafts are intentionally ignored.
  let writtenLesson: ReturnType<typeof buildWrittenLessonContext>;
  try {
    writtenLesson = buildWrittenLessonContext({
      profileTrack: learnerProfile.learner_track, requestedTrack: track,
      requestedLessonId: lessonId, resolvedLessonId: persistenceLessonId,
    }, LESSON_MODULES, STUDY_PACKS);
    if (writtenLesson) lessonContext = writtenLesson.context;
  } catch {
    return send(res, 503, {error:'written_lesson_context_unavailable'});
  }
`);
edit(api, '    lessonContext,\n    budgetReservationId:', '    lessonContext,\n    teachingContent: writtenLesson?.descriptor ?? null,\n    budgetReservationId:');
edit(api, '      sessionId: persistence.sessionId,\n    });', '      sessionId: persistence.sessionId,\n      teachingContent: writtenLesson?.descriptor ?? null,\n    });');
// API NodeNext checks also visit this module; its dependency is type-only at runtime.
edit('src/learning/lessonModules.ts', "import type { StudyTrack } from './teachingPacks';", "import type { StudyTrack } from './teachingPacks.js';");
edit('src/main.tsx', "import './little-english.css';", "import './little-english.css';\nimport './adult-mobile-utilities.css';");
edit('src/components/ProfessorLearningGuide.tsx', 'This companion is not yet part of the live Professor’s lesson context. It supplements preparation; it does not replace the complete Golden Lesson.', 'In this preview, the server prepares the matching written lesson for the Professor and evaluator when you start a session. Local drafts and quiz results are not sent. Actual use in a voice conversation still needs validation.');
edit('src/components/LessonStudyPanel.tsx', 'Written content is not yet supplied to the live Professor. Audio, real conversation, persisted exercise assessment and complete curriculum coverage remain separate work. This lesson creates no learning-history entry.', 'This preview prepares the matching written lesson on the server for the Professor and evaluator. Local drafts and quiz results are not sent. Live voice use, persisted assessment and complete curriculum coverage remain separate work.');
edit('tests/professor-study-guide.spec.ts', "toContainText('not yet part of the live Professor')", "toContainText('Actual use in a voice conversation still needs validation')");
edit('tests/written-lessons.spec.ts', "toContainText('not yet supplied to the live Professor')", "toContainText('Local drafts and quiz results are not sent')");
console.log('Wired authored lesson reference on the candidate API and normal-flow adult mobile utilities. No calls, backend writes or worker deployment.');
