import {DEEP_ENGLISH_UNIT_1_CONTRACT} from '../../../src/learning/deepEnglishUnit1.ts';
import {DEEP_RP1,DEEP_VE2} from '../../../src/learning/deepEnglishSecondUnits.ts';
import {ENGLISH_E1_MODEL_ID,ENGLISH_P1_MODEL_ID} from '../../../src/learning/localEnglishLessonRegistry.ts';
import {VIVIANE_ENGLISH_IDENTITIES} from '../../../src/learning/vivianeEnglishLessonRegistry.ts';
import {englishPracticeSession} from '../../../src/learning/englishPracticeSession.ts';
import {englishSpeakingPhrasesFor} from '../../../src/learning/englishSpeakingPhrases.ts';
import type {EnglishActivityKind} from '../../../src/learning/englishActivityAssessment.ts';

export function englishActivitySource(lessonId:string,kind:EnglishActivityKind,itemId:string,profile:string){
 const entry=lessonId===ENGLISH_E1_MODEL_ID?{deep:DEEP_ENGLISH_UNIT_1_CONTRACT,profile:'rafael_finance'}
  :lessonId===ENGLISH_P1_MODEL_ID?{deep:DEEP_RP1.contract,profile:'rafael_finance'}
  :lessonId===VIVIANE_ENGLISH_IDENTITIES.VE1.id?{deep:DEEP_ENGLISH_UNIT_1_CONTRACT,profile:'viviane_payroll'}
  :lessonId===VIVIANE_ENGLISH_IDENTITIES.VE2.id?{deep:DEEP_VE2.contract,profile:'viviane_payroll'}:null;
 if(!entry||entry.profile!==profile)throw Error('activity_forbidden');
 if(kind==='speaking'){
  if(!/^(0|[1-9][0-9]?)$/.test(itemId))throw Error('activity_not_found');
  const phrase=englishSpeakingPhrasesFor(lessonId)[Number(itemId)];
  if(!phrase)throw Error('activity_not_found');
  return {question:phrase.text,reference:phrase.focus,context:'Repeat the target phrase. Pronunciation practice only.',revision:'english-activity-1'};
 }
 const item=englishPracticeSession(lessonId,entry.deep).find(row=>row.item.id===itemId)?.item;
 if(!item||!['short-text','extended-text'].includes(item.responseMode))throw Error('activity_not_found');
 return {question:item.prompt,reference:JSON.stringify(item.evaluation),context:JSON.stringify(entry.deep.english?.contextualInput??{}),revision:'english-activity-1'};
}
