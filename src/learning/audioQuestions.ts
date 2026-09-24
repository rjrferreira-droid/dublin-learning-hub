import {ENGLISH_E1_MODEL_ID,ENGLISH_P1_MODEL_ID} from './localEnglishLessonRegistry.ts';

export type AudioQuestion={question:string;reference:string};

// Questions are authored against the independent episode, not inferred from Learn.
const questions:Readonly<Record<string,readonly AudioQuestion[]>>={
 [ENGLISH_E1_MODEL_ID]:[
  {question:'Where was Nora trying to go?',reference:'A photography exhibition at Riverside Community Centre.'},
  {question:'Why did Nora arrive at Riverside Court?',reference:'She selected the similarly named housing estate on her map instead of the community centre.'},
  {question:'How did Sam help her?',reference:'He showed her a shortcut through the park and pointed out the right building.'},
  {question:'What had happened by the time Nora arrived?',reference:'The talk had already started, but she had only missed the introduction.'},
  {question:'How did the mistake help other visitors?',reference:'An organiser added a clearer landmark to the event page after hearing about Nora’s wrong turn.'},
 ],
 [ENGLISH_P1_MODEL_ID]:[
  {question:'What difference between the two reports was confirmed?',reference:'The reports used different cut-off times.'},
  {question:'Why could the team not blame the journals yet?',reference:'The mapping file had also changed, so the cause was still uncertain.'},
  {question:'What did Rafael ask before accepting the claim of an error?',reference:'He asked which report and cut-off time Niamh was comparing.'},
  {question:'Who took responsibility for the next checks?',reference:'Rafael would reconcile the journals, and Theo would validate the mapping and approval time.'},
  {question:'When would the team revisit the decision?',reference:'They would send the exception list by eleven and decide after reviewing the evidence.'},
 ],
};

export function audioQuestionsFor(lessonId:string):readonly AudioQuestion[]{return questions[lessonId]??[];}
