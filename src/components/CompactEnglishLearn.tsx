import type {LessonModule} from '../learning/lessonModules';
import {ENGLISH_E1_MODEL_ID,ENGLISH_P1_MODEL_ID} from '../learning/localEnglishLessonRegistry';
import {VIVIANE_ENGLISH_IDENTITIES} from '../learning/vivianeEnglishLessonRegistry';
import {grammarConceptsFor} from '../learning/englishGrammarConcepts';
import {englishCompanionsFor} from '../learning/englishCompanions';
import '../learning/compact-english-learn.css';

type Rule={form:string;use:string;example:string};
type Page={title:string;scene:string;image?:string;imageAlt?:string;exchange:readonly {speaker:string;text:string}[];ruleTitle:string;rules:readonly Rule[];lastTitle:string;last:string;lastExample:string};

const storyPage:Page={
 title:'Three past forms in a story',scene:'Maya reached the wrong entrance to a film screening. An organiser helped her find the way in.',
 image:'/learn/story-entrance.webp',imageAlt:'Maya sees an organiser beside the cinema entrance after finding a locked gate.',
 exchange:[{speaker:'Maya',text:'I was looking for the entrance when an organiser came out. I had saved the address, but I had not checked the entrance.'}],
 ruleTitle:'Show when each action happened',rules:[
  {form:'had saved',use:'Earlier than the moment in the story',example:'I had saved the address.'},
  {form:'was looking',use:'An action in progress',example:'I was looking for the entrance…'},
  {form:'came out',use:'The event that moves the story forward',example:'…when an organiser came out.'},
 ],
 lastTitle:'Keep the conversation going',last:'React to the detail, then ask one connected question.',lastExample:'That was lucky. Did you get to see the film?',
};

const meetingPage:Page={
 title:'Clarify before you conclude',scene:'Two reports show different balances. The team needs to confirm which comparison is being used.',
 image:'/learn/meeting-clarity.webp',imageAlt:'Colleagues compare two reports together in a meeting.',
 exchange:[{speaker:'Niamh',text:'Why is the balance wrong?'},{speaker:'Rafael',text:'Could we confirm which report and period you are using?'}],
 ruleTitle:'Ask an indirect question',rules:[
  {form:'Could you confirm…',use:'A clear, polite opening',example:'Could you confirm when the file was approved?'},
  {form:'when the file was approved',use:'Use statement order inside the question',example:'Not: “when was the file approved?”'},
  {form:'may have',use:'Mark a possible cause, not a conclusion',example:'The journal may have caused the difference.'},
 ],
 lastTitle:'Close with an action',last:'Separate what is confirmed from what still needs a check.',lastExample:'The cut-off times differ. I will reconcile the reports and return by 3 p.m.',
};

const plansPage:Page={
 title:'Plans and changes',scene:'Ciara and Viviane have a canal walk arranged, but rain may change the plan.',
 image:'/learn/rain-plans.webp',imageAlt:'Two friends with umbrellas consider an indoor market during a rainy Dublin afternoon.',
 exchange:[{speaker:'Ciara',text:'Are we still meeting by the canal at two?'},{speaker:'Viviane',text:'Yes. If it rains, we could go to the indoor market.'}],
 ruleTitle:'Choose the form for your meaning',rules:[
  {form:'We are meeting…',use:'An arrangement is already in place',example:'We are meeting at two.'},
  {form:'I am going to…',use:'An intention you had before speaking',example:'I am going to bring a coat.'},
  {form:'I will…',use:'A decision or promise made now',example:'I will check the forecast.'},
 ],
 lastTitle:'Add a condition',last:'Use the present form after if for a realistic future possibility.',lastExample:'If it rains, we will meet inside the station.',
};

function pageFor(module:LessonModule):Page{
 if(module.lessonId===ENGLISH_E1_MODEL_ID||module.lessonId===VIVIANE_ENGLISH_IDENTITIES.VE1.id)return storyPage;
 if(module.lessonId===ENGLISH_P1_MODEL_ID)return meetingPage;
 if(module.lessonId===VIVIANE_ENGLISH_IDENTITIES.VE2.id)return plansPage;
 const deep=module.deepLesson?.english;
 const terms=module.terms.slice(0,3);
 return {
  title:deep?.grammar.target??module.title,scene:module.goal,
  exchange:deep?.contextualInput.turns.slice(0,2)??[],
  ruleTitle:'Notice the useful forms',rules:terms.map(term=>({form:term.term,use:term.meaning,example:term.example})),
  lastTitle:'Try it in your own words',last:'Use one form from the examples in a sentence about your situation.',lastExample:terms[0]?.example??'',
 };
}

export function CompactEnglishLearn({module,onContinue,disabled=false}:{module:LessonModule;onContinue:()=>void;disabled?:boolean}){
 const page=pageFor(module);
 const concepts=grammarConceptsFor(module.lessonId);
 const companion=englishCompanionsFor(module.lessonId);
 return <section className="lesson-study-section deep-learn compact-english-learn" data-testid="deep-lesson-learn">
  {companion?<div className="english-optional-video"><span>BEFORE THE UNIT · OPTIONAL</span><a href={companion.before.url} target="_blank" rel="noopener noreferrer">Watch: {companion.before.label} ↗</a><small>The unit uses the theme; the lesson and its exercises are original.</small></div>:null}
  <header className="english-page-title"><span className="english-unit-mark">LEARN</span><h2>{page.title}</h2></header>
  {concepts.length?<nav className="english-concept-outline" aria-label="Grammar concepts in this unit"><strong>In this Learn</strong>{concepts.map((concept,index)=><a key={concept.id} href={`#english-concept-${concept.id}`}><span>{String(index+1).padStart(2,'0')}</span>{concept.title}</a>)}</nav>:null}
  <div className="english-page-body">
   <section className="english-page-section english-page-situation" aria-labelledby="english-learn-situation">
    <div className="english-section-label" aria-hidden="true">A</div>
    <div className="english-situation-copy"><h3 id="english-learn-situation">A situation</h3><p>{page.scene}</p>
     <div className="english-scene-dialogue">{page.exchange.map((line,index)=><p key={`${line.speaker}-${index}`}><strong>{line.speaker}:</strong> {line.text}</p>)}</div>
    </div>
    {page.image?<img src={page.image} alt={page.imageAlt??''} width="360" height="240" loading="lazy"/>:null}
   </section>
   <section className="english-page-section" aria-labelledby="english-learn-rule">
    <div className="english-section-label" aria-hidden="true">B</div>
    <div><h3 id="english-learn-rule">{page.ruleTitle}</h3><div className="english-rule-list">{page.rules.map(rule=><div className="english-rule-row" key={rule.form}><strong>{rule.form}</strong><span>{rule.use}</span><em>{rule.example}</em></div>)}</div></div>
   </section>
   {concepts.map((concept,index)=><section className="english-concept-card" id={`english-concept-${concept.id}`} key={concept.id} aria-labelledby={`english-concept-title-${concept.id}`}>
    <header><span>{String(index+1).padStart(2,'0')}</span><h3 id={`english-concept-title-${concept.id}`}>{concept.title}</h3><small>{concept.form}</small></header>
    <div className="english-concept-explanation"><div><strong>When to use it</strong><p>{concept.when}</p></div><div><strong>Why it works</strong><p>{concept.why}</p></div></div>
    <div className="english-concept-form"><strong>How to form it</strong><p>{concept.how}</p></div>
    <div className="english-concept-examples"><strong>In this situation</strong>{concept.examples.map(example=><p key={example}>“{example}”</p>)}</div>
    <p className="english-concept-contrast"><strong>Notice:</strong> {concept.contrast}</p>
   </section>)}
   <section className="english-page-section english-page-final" aria-labelledby="english-learn-final">
    <div className="english-section-label" aria-hidden="true">C</div>
    <div><h3 id="english-learn-final">{page.lastTitle}</h3><p>{page.last}</p><p className="english-final-example">{page.lastExample}</p></div>
   </section>
  </div>
  <button className="english-learn-next" type="button" disabled={disabled} onClick={onContinue}>Continue to Audio →</button>
 </section>;
}
