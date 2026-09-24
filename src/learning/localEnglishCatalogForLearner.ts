import type {LearnerKey} from '../learners/profiles.ts';
import {LOCAL_ENGLISH_LESSONS} from './localEnglishLessonRegistry.ts';
import {LOCAL_VIVIANE_ENGLISH_LESSONS} from './vivianeEnglishLessonRegistry.ts';

/** Keep English catalogue identity and progress isolated by learner profile. */
export function localEnglishLessonsForLearner(learnerKey:LearnerKey){
 return learnerKey==='viviane'?LOCAL_VIVIANE_ENGLISH_LESSONS:LOCAL_ENGLISH_LESSONS;
}
