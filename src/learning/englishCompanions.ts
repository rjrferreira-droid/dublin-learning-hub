import {ENGLISH_E1_MODEL_ID,ENGLISH_P1_MODEL_ID} from './localEnglishLessonRegistry.ts';
import {VIVIANE_ENGLISH_IDENTITIES} from './vivianeEnglishLessonRegistry.ts';

type Companion={label:string;url:string};
export type EnglishCompanions={before:Companion;after:Companion};
const conversation={label:'BBC Learning English · The art of conversation (6 Minute English)',url:'https://www.youtube.com/watch?v=xGhbhWUqL-w'};
const companions:Readonly<Record<string,EnglishCompanions>>={
 [ENGLISH_E1_MODEL_ID]:{before:{label:'TED · Andrew Stanton: The clues to a great story',url:'https://www.ted.com/talks/andrew_stanton_the_clues_to_a_great_story'},after:conversation},
 [VIVIANE_ENGLISH_IDENTITIES.VE1.id]:{before:{label:'TED · Andrew Stanton: The clues to a great story',url:'https://www.ted.com/talks/andrew_stanton_the_clues_to_a_great_story'},after:conversation},
 [ENGLISH_P1_MODEL_ID]:{before:{label:'TED · Charles Duhigg: The science behind dramatically better conversations',url:'https://www.ted.com/talks/charles_duhigg_the_science_behind_dramatically_better_conversations_sep_2025'},after:conversation},
 [VIVIANE_ENGLISH_IDENTITIES.VE2.id]:{before:{label:'TED · Maya Shankar: Why change is so scary',url:'https://www.ted.com/talks/maya_shankar_why_change_is_so_scary_and_how_to_unlock_its_potential'},after:conversation},
};
export function englishCompanionsFor(lessonId:string):EnglishCompanions|undefined{return companions[lessonId];}
