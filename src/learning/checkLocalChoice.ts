import type {CheckpointQuestion} from './lessonModules';

export type LocalChoiceResult='unanswered'|'correct'|'incorrect';

export function checkLocalChoice(question:CheckpointQuestion,selected:unknown):LocalChoiceResult{
 if(typeof selected!=='number'||!Number.isInteger(selected)||selected<0||selected>=question.options.length)return 'unanswered';
 return selected===question.correctIndex?'correct':'incorrect';
}
