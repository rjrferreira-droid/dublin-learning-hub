import type {DeepLessonContract,GrammarItem,ProgressivePracticeItem} from './deepLessonContract.ts';
import {ENGLISH_E1_MODEL_ID,ENGLISH_P1_MODEL_ID} from './localEnglishLessonRegistry.ts';
import {VIVIANE_ENGLISH_IDENTITIES} from './vivianeEnglishLessonRegistry.ts';

export type EnglishPracticeQuestion={item:GrammarItem|ProgressivePracticeItem;kind:'grammar'|'practice'};
const choice=(id:string,prompt:string,answer:string,other1:string,other2:string):ProgressivePracticeItem=>({
 id,prompt,progression:'apply',sourceBucket:'current',responseMode:'single-select',estimatedMinutes:1,
 options:[{id:`${id}-a`,label:answer},{id:`${id}-b`,label:other1},{id:`${id}-c`,label:other2}],
 evaluation:{kind:'selection',correctOptionIds:[`${id}-a`],explanation:`“${answer}” fits the meaning and the situation.`},
 evidence:{objectiveIds:[],record:'item-result',errorBank:'after-final-incorrect'},
});

const extra:Record<string,readonly ProgressivePracticeItem[]>={
 [ENGLISH_P1_MODEL_ID]:[
  choice('rp1-extra-1','Ask indirectly about the approval time.','Could you confirm when the file was approved?','Could you confirm when was the file approved?','Could you confirm when did the file approve?'),
  choice('rp1-extra-2','Request a colleague to check the final upload.','Could you check the final upload?','Could you checking the final upload?','You must check it now, perhaps?'),
  choice('rp1-extra-3','The cause is still unverified. Which statement is accurate?','The journal may have caused the difference.','The journal definitely caused the difference.','The journal has must caused the difference.'),
  choice('rp1-extra-4','Close the meeting with a specific next step.','I will reconcile the reports and send the exceptions by three.','Perhaps something might be checked someday.','The reports are definitely wrong, so there is nothing to check.'),
 ],
 [VIVIANE_ENGLISH_IDENTITIES.VE2.id]:[
  choice('ve2-extra-1','Choose the prior intention.','I am going to bring a coat.','I brought a coat tomorrow.','I going to bring a coat.'),
  choice('ve2-extra-2','Choose a decision made at this moment.','I will check the forecast now.','I checked the forecast tomorrow.','I will checking the forecast now.'),
  choice('ve2-extra-3','Offer an alternative without deciding for everyone.','We could meet at the indoor market.','We must definitely meet there.','We could meeting there.'),
 ],
};

export function englishPracticeSession(lessonId:string,deep:DeepLessonContract):readonly EnglishPracticeQuestion[]{
 const grammar=deep.english?.grammar.items??[];
 const practice=deep.practice.items;
 const selections=[...grammar.map(item=>({item,kind:'grammar' as const})),...practice.map(item=>({item,kind:'practice' as const})),...(extra[lessonId]??[]).map(item=>({item,kind:'practice' as const}))]
  .filter(({item})=>item.responseMode==='single-select'||item.responseMode==='multi-select').slice(0,10);
 const written=[...grammar.map(item=>({item,kind:'grammar' as const})),...practice.map(item=>({item,kind:'practice' as const}))]
  .filter(({item})=>item.responseMode==='short-text'||item.responseMode==='extended-text').slice(0,10);
 return [...selections.map(({item,kind},index)=>({item:{...item,options:item.options?
  [...item.options.slice((index+item.id.length)%item.options.length),...item.options.slice(0,(index+item.id.length)%item.options.length)]:undefined},kind})),...written];
}
