import {ENGLISH_E1_MODEL_ID,ENGLISH_P1_MODEL_ID} from './localEnglishLessonRegistry.ts';
import {VIVIANE_ENGLISH_IDENTITIES} from './vivianeEnglishLessonRegistry.ts';
import {grammarConceptsFor} from './englishGrammarConcepts.ts';

export type AudioQuestion={conceptId:string;question:string;reference:string};

// Questions are authored against the independent episode, not inferred from Learn.
const storyQuestions:readonly AudioQuestion[]=[
 {conceptId:'past-simple',question:'Which completed events took Nora from the bus stop to the wrong place?',reference:'She got off the bus, followed the map, walked down a residential street and reached a row of houses at Riverside Court.'},
 {conceptId:'past-continuous',question:'What was Nora doing when Sam offered to help?',reference:'She was standing under a tree after realising she was near Riverside Court rather than the community centre.'},
 {conceptId:'past-perfect',question:'What had happened before Nora reached the exhibition, and what had she missed?',reference:'She had selected the wrong Riverside on her map. The talk had already started when she arrived, but she had only missed the introduction.'},
 {conceptId:'story-sequence',question:'How did Nora’s wrong turn lead to something useful for later visitors?',reference:'Sam showed Nora a shortcut and learnt about the exhibition; afterwards an organiser added a clearer landmark to the event page.'},
 {conceptId:'follow-up',question:'What connected question could you ask about Sam after hearing Nora’s story?',reference:'For example, “Did Sam come to the exhibition later?” The host suggests following a detail Nora actually mentioned.'},
];
const questions:Readonly<Record<string,readonly AudioQuestion[]>>={
 [ENGLISH_E1_MODEL_ID]:storyQuestions,
 [VIVIANE_ENGLISH_IDENTITIES.VE1.id]:storyQuestions,
 [VIVIANE_ENGLISH_IDENTITIES.VE2.id]:[
  {conceptId:'arrangement',question:'What are Ciara and Viviane doing at two, and where are they meeting after changing the plan?',reference:'They are meeting inside the station entrance at two. They originally planned to meet by the canal.'},
  {conceptId:'intention',question:'What was Viviane going to do with her coat, and why did her intention change?',reference:'She was going to leave it at home, but the cold weather made her decide to bring it.'},
  {conceptId:'decision',question:'What does Ciara decide to do at one? Answer as Ciara using will.',reference:'“I will check the forecast again at one.” She makes that decision in the conversation.'},
  {conceptId:'condition',question:'What will they do if the rain stays light, and what happens if Ciara’s bus is delayed?',reference:'If the rain stays light, they will walk. If Ciara’s bus is delayed, she will message Viviane.'},
  {conceptId:'suggestion',question:'Which alternative could they choose if the weather gets worse? Make the suggestion as Viviane.',reference:'“We could go to the indoor market.” The market is their wet-weather alternative.'},
 ],
 [ENGLISH_P1_MODEL_ID]:[
  {conceptId:'embedded-questions',question:'Which report and period did Rafael ask Niamh to confirm before accepting the claim of an error?',reference:'He asked which report and cut-off time Niamh was comparing.'},
  {conceptId:'modal-requests',question:'How did Rafael ask for confirmation without blaming anyone?',reference:'He used a polite request such as “Could we confirm which report and period you are using?”'},
  {conceptId:'evidence',question:'What was confirmed, and why was the cause still uncertain?',reference:'The reports used different cut-off times, but the mapping file had also changed, so the journals could not yet be blamed.'},
  {conceptId:'playback',question:'Who owned the two checks after the discussion?',reference:'Rafael would reconcile the journals and Theo would validate the mapping and approval time.'},
  {conceptId:'future-action',question:'When would the team revisit the decision?',reference:'They would send the exception list by eleven and decide after reviewing the evidence.'},
 ],
};

export function audioQuestionsFor(lessonId:string):readonly AudioQuestion[]{return questions[lessonId]??[];}
export function audioQuestionCoverage(lessonId:string):boolean{
 const concepts=grammarConceptsFor(lessonId),items=audioQuestionsFor(lessonId);
 return concepts.length>0&&items.length===concepts.length&&items.every((item,index)=>item.conceptId===concepts[index].id);
}
