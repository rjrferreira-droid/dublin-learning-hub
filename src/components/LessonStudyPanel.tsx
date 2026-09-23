import { useEffect, useState } from 'react';
import {AppliedPracticePanel} from './AppliedPracticePanel';
import {BrowserLessonReader} from './BrowserLessonReader';
import { lessonModuleFor, type LessonModule } from '../learning/lessonModules';
import {checkLocalChoice} from '../learning/checkLocalChoice';
import {loadReviewedRuntimeModuleFor} from '../learning/loadReviewedRuntimeModule';
import {loadReviewedLesson,type WrittenLoadResult} from '../learning/loadReviewedLesson';
import { STUDY_PACKS, type StudyTrack } from '../learning/teachingPacks';
import type {LocalReviewCompletion,LocalReviewStage} from '../learning/localStudyProgress';
import {localVivianeEnglishCodeFor} from '../learning/vivianeEnglishLessonRegistry';
import {VIVIANE_ENGLISH_COMPANIONS} from '../learning/vivianeEnglishCompanions';
import '../learning/lesson-study.css';

const studyTabs=new Set(['Learn','English','Grammar','Practice','Speaking','Visual','Case','Test','Sources']);
type Props={track:StudyTrack;lessonId:string;lessonSlug?:string;activeTab:string;onTabChange:(tab:string)=>void;onPrepareWorkshop?:(id:string)=>void;handoffDisabled?:boolean;readerDisabled?:boolean;localCompletion?:{completedAt:string;correct:number;total:number};onCompleteLocal?:(correct:number,total:number)=>void;nextLessonTitle?:string;onOpenNextLesson?:()=>void;localReviewStage?:LocalReviewStage;localReviewCompletion?:LocalReviewCompletion};
export function LessonStudyPanel({track,lessonId,lessonSlug,activeTab,onTabChange,onPrepareWorkshop,handoffDisabled,readerDisabled,localCompletion,onCompleteLocal,nextLessonTitle,onOpenNextLesson,localReviewStage,localReviewCompletion}:Props){
 const staticModule=lessonModuleFor(track,lessonId);
 const scope=JSON.stringify([track,lessonId,lessonSlug]);
 const [attempt,setAttempt]=useState(0);
 const [deferred,setDeferred]=useState<{scope:string;attempt:number;result:WrittenLoadResult}|null>(null);
 useEffect(()=>{
  if(staticModule||!lessonSlug)return;
  const controller=new AbortController();
  void loadReviewedLesson({track,lessonId,lessonSlug},()=>loadReviewedRuntimeModuleFor(track,{id:lessonId,slug:lessonSlug}),controller.signal)
   .then(result=>{if(!controller.signal.aborted)setDeferred({scope,attempt,result});});
  return ()=>controller.abort();
 },[track,lessonId,lessonSlug,staticModule,scope,attempt]);
 const result=deferred?.scope===scope&&deferred.attempt===attempt?deferred.result:null;
 const module=staticModule??(result?.status==='ready'?result.module:null);
 if(!module)return studyTabs.has(activeTab)?<div data-testid="written-lesson-loading">
  <p role="status">{!lessonSlug||result?.status==='missing'?'No reviewed written module is available for this lesson yet.':result?.status==='unavailable'?'The written lesson could not be loaded. Check your connection and try again.':'Loading reviewed lesson…'}</p>
  {result?.status==='unavailable'?<button type="button" className="secondary-btn" onClick={()=>setAttempt(n=>n+1)}>Try loading again</button>:null}
 </div>:null;
 return <>{(activeTab==='Learn'||activeTab==='Audio')&&<BrowserLessonReader key={module.lessonId+activeTab} module={module} disabled={readerDisabled}/>}<StudyContent key={module.lessonId} module={module} lessonSlug={lessonSlug} activeTab={activeTab} onTabChange={onTabChange} onPrepareWorkshop={onPrepareWorkshop} handoffDisabled={handoffDisabled} localCompletion={localCompletion} onCompleteLocal={onCompleteLocal} nextLessonTitle={nextLessonTitle} onOpenNextLesson={onOpenNextLesson} localReviewStage={localReviewStage} localReviewCompletion={localReviewCompletion}/></>;
}
function StudyContent({module,lessonSlug,activeTab,onTabChange,onPrepareWorkshop,handoffDisabled,localCompletion,onCompleteLocal,nextLessonTitle,onOpenNextLesson,localReviewStage,localReviewCompletion}:{module:LessonModule;lessonSlug?:string;activeTab:string;onTabChange:(tab:string)=>void;onPrepareWorkshop?:(id:string)=>void;handoffDisabled?:boolean;localCompletion?:{completedAt:string;correct:number;total:number};onCompleteLocal?:(correct:number,total:number)=>void;nextLessonTitle?:string;onOpenNextLesson?:()=>void;localReviewStage?:LocalReviewStage;localReviewCompletion?:LocalReviewCompletion}){
 const pack=STUDY_PACKS[module.track];
 const exercises=module.practiceExercises??pack.exercises;
 const [drafts,setDrafts]=useState<Record<string,string>>({});
 const [revealed,setRevealed]=useState<Record<string,boolean>>({});
 const [practiceAttempts,setPracticeAttempts]=useState<Record<string,number>>({});
 const [answers,setAnswers]=useState<Record<string,{selected?:number;checked?:boolean}>>({});
 const [grammarChoice,setGrammarChoice]=useState<number|undefined>();
 const [grammarChoiceAttempts,setGrammarChoiceAttempts]=useState(0);
 const [grammarDraft,setGrammarDraft]=useState('');
 const [grammarDraftAttempts,setGrammarDraftAttempts]=useState(0);
 const [reviewTarget,setReviewTarget]=useState<string|null>(null);
 const visible=studyTabs.has(activeTab);
 const checked=module.checkpoint.filter(q=>answers[q.id]?.checked);
 const correct=checked.filter(q=>checkLocalChoice(q,answers[q.id]?.selected)==='correct');
 useEffect(()=>{
  if(activeTab!=='Learn'||!reviewTarget)return;
  const frame=requestAnimationFrame(()=>document.getElementById('lesson-section-'+reviewTarget)?.scrollIntoView({block:'start'}));
  return ()=>cancelAnimationFrame(frame);
 },[activeTab,reviewTarget]);
 function review(section:string){setReviewTarget(section);onTabChange('Learn');}
 const feedbackFor=(id:string)=>module.checkpoint.find(q=>q.id===id);
 const vivianeCode=lessonSlug?localVivianeEnglishCodeFor(module.track,{id:module.lessonId,slug:lessonSlug}):null;
 const companion=vivianeCode?VIVIANE_ENGLISH_COMPANIONS[vivianeCode]:null;
 const grammarTarget=companion?.grammarTarget??grammarTargetFor(module);
 const pronunciationTarget=companion?.pronunciationTarget??pronunciationTargetFor(module);
 return <div className="lesson-study-panel" data-testid="lesson-study-panel" data-track={module.track} hidden={!visible}>
  <div className="lesson-study-banner"><strong>Written lesson · self-study</strong><span>No AI call · drafts and checks stay only in this open lesson</span></div>
  <section className="lesson-study-section" hidden={activeTab!=='Learn'} data-testid="lesson-reading">
   <h2>{module.title}</h2><p className="lesson-study-lead">{module.goal}</p>
   <p className="lesson-study-note">Read the core in a short sitting; continue with practice at your own pace. Optional Portuguese support is available below each section.</p>
   <nav className="lesson-study-outline" aria-label="Written lesson sections">{module.sections.map(s=><a key={s.id} href={'#lesson-section-'+s.id}>{s.title}</a>)}</nav>
   {module.sections.map(s=><section key={s.id} id={'lesson-section-'+s.id} className="lesson-teaching-block">
    <h3>{s.title}</h3>{s.paragraphs.map((p,i)=><p key={i}>{p}</p>)}
    <details><summary>Resumo em português</summary><p lang="pt-BR">{s.supportPt}</p></details>
    <div className="lesson-inline-sources">{s.sourceIds.length?s.sourceIds.map(id=>{const src=module.sources.find(x=>x.id===id);return src?<a key={id} href={src.url} target="_blank" rel="noopener noreferrer">{src.label}</a>:null;}):<span>Original practice guidance, not an additional regulatory requirement.</span>}</div>
   </section>)}
   <div className="lesson-study-next"><button type="button" onClick={()=>onTabChange('Practice')}>Try the practice questions</button></div>
  </section>
  <section className="lesson-study-section" hidden={activeTab!=='English'} data-testid="lesson-vocabulary">
   <h2>English you can use in this lesson</h2><p>Explain the idea, then use the term in your own sentence. Definitions and examples are for this lesson, not an audio assessment.</p>
   <dl className="lesson-term-list">{module.terms.map(t=><div key={t.term}><dt>{t.term}<small lang="pt-BR">{t.pt}</small></dt><dd>{t.meaning}<p className="lesson-term-example">{t.example}</p></dd></div>)}</dl>
   <p className="lesson-study-note">No microphone is opened here; reading an example is not a pronunciation or fluency result.</p>
  </section>
  <section className="lesson-study-section" hidden={activeTab!=='Grammar'} data-testid="lesson-grammar">
   <div className="lesson-section-kicker">GRAMMAR · GUIDED PRACTICE</div><h2>Use the form inside a real situation</h2>
   <div className="grammar-target"><strong>Today’s target</strong><p>{grammarTarget}</p></div>
   {module.checkpoint[0]?<fieldset className="lesson-check-question grammar-choice"><legend>1. Choose the strongest answer for this situation</legend>{module.checkpoint[0].options.map((option,index)=><label key={option}><input type="radio" name={`grammar-${module.lessonId}`} checked={grammarChoice===index} onChange={()=>setGrammarChoice(index)}/><span>{option}</span></label>)}<button type="button" disabled={grammarChoice===undefined||grammarChoiceAttempts>=2} onClick={()=>setGrammarChoiceAttempts(attempts=>attempts+1)}>{grammarChoiceAttempts===0?'Check answer':'Try again'}</button>{grammarChoiceAttempts>0?<div className={`lesson-answer-feedback ${checkLocalChoice(module.checkpoint[0],grammarChoice)==='correct'?'correct':''}`} role="status"><strong>{checkLocalChoice(module.checkpoint[0],grammarChoice)==='correct'?'Correct — the form fits the context':grammarChoiceAttempts<2?'Not yet — use the target above and try once more':'Two attempts completed'}</strong>{checkLocalChoice(module.checkpoint[0],grammarChoice)==='correct'||grammarChoiceAttempts>=2?<p>{module.checkpoint[0].explanation}</p>:<p>Look for the option that preserves both meaning and register.</p>}</div>:null}</fieldset>:null}
   <div className="grammar-production"><h3>2. Write your own version</h3><p>Write two or three sentences that use today’s target naturally in the lesson scenario.</p><textarea value={grammarDraft} onChange={event=>setGrammarDraft(event.target.value)} maxLength={1200} placeholder="Write your answer in English…"/><div className="lesson-inline-actions"><button type="button" disabled={grammarDraft.trim().length<20||grammarDraftAttempts>=2} onClick={()=>setGrammarDraftAttempts(attempts=>attempts+1)}>{grammarDraftAttempts===0?'Check my response':'Check my revision'}</button></div>{grammarDraftAttempts===1?<div className="lesson-hint"><strong>Revision checklist</strong><p>Check the target form, the time reference and whether the sentence sounds natural in this situation. Revise once before comparing.</p></div>:null}{grammarDraftAttempts>=2?<div className="lesson-worked-response"><strong>Useful model from this lesson</strong><p>{module.terms[0]?.example??module.practiceExercises?.[0]?.answer}</p><p>Compare the structure and meaning; your wording does not need to match exactly.</p><small>Not added to Error Bank · this local draft is not an evaluated learner error.</small></div>:null}</div>
  </section>
  <section className="lesson-study-section" hidden={activeTab!=='Practice'} data-testid="lesson-practice">
   {module.lessonId===pack.lessonId&&<AppliedPracticePanel key={module.track} track={module.track} onPrepare={onPrepareWorkshop} handoffDisabled={handoffDisabled}/>}
   <h2>Retrieve, then compare</h2><p>Try each question before opening help. Drafts remain while you switch tabs, but disappear when this lesson closes, the page reloads or the account signs out. Avoid confidential information.</p>
   {exercises.map((q,i)=><section className="lesson-exercise" key={q.id} data-testid={'written-practice-'+i}>
    <h3>{i+1}. {q.question}</h3><label htmlFor={'draft-'+q.id}>Your practice draft {i+1}</label>
    <textarea id={'draft-'+q.id} maxLength={6000} value={drafts[q.id]??''} onChange={e=>setDrafts(x=>({...x,[q.id]:e.target.value}))} placeholder="Try explaining it in your own words…"/>
    <div className="lesson-inline-actions"><button type="button" disabled={(drafts[q.id]?.trim().length??0)<20||(practiceAttempts[q.id]??0)>=2} onClick={()=>setPracticeAttempts(attempts=>({...attempts,[q.id]:Math.min(2,(attempts[q.id]??0)+1)}))}>{(practiceAttempts[q.id]??0)===0?'Check my response':'Check my revision'}</button><button type="button" disabled={(practiceAttempts[q.id]??0)<2} aria-expanded={revealed[q.id]===true} onClick={()=>setRevealed(x=>({...x,[q.id]:!x[q.id]}))}>{revealed[q.id]?'Hide worked response':'Compare with worked response'}</button></div>
    {(practiceAttempts[q.id]??0)===1?<p className="lesson-hint"><strong>One focused hint:</strong> {q.hints[0]} Revise the answer once before opening the model.</p>:null}
    {(practiceAttempts[q.id]??0)>=2&&!revealed[q.id]?<p className="lesson-local-result" role="status">Two attempts completed. The worked response is now available for comparison.</p>:null}
    {revealed[q.id]&&<div className="lesson-worked-response"><strong>One worked response</strong><p>{q.answer}</p><p>{q.explanation}</p><small>Not added to Error Bank · your draft has not been automatically graded.</small></div>}
   </section>)}
  </section>
  <section className="lesson-study-section" hidden={activeTab!=='Speaking'} data-testid="lesson-speaking">
   <SpeakingPractice module={module} pronunciationTarget={pronunciationTarget} />
  </section>
  <section className="lesson-study-section" hidden={activeTab!=='Visual'} data-testid="lesson-visual">
   <h2>{module.visual.title}</h2><p>{module.visual.note}</p>
   <div className="lesson-table-wrap" role="region" aria-label="Worked-example evidence table" tabIndex={0}><table><caption>{module.visual.title}</caption><thead><tr>{module.visual.headers.map(h=><th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{module.visual.rows.map((row,i)=><tr key={i}><th scope="row">{row[0]}</th><td>{row[1]}</td><td>{row[2]}</td></tr>)}</tbody></table></div>
   <h3>{module.visual.question}</h3><details><summary>Compare the interpretation</summary><p>{module.visual.answer}</p></details>
  </section>
  <section className="lesson-study-section" hidden={activeTab!=='Case'} data-testid="lesson-case">
   <h2>{module.caseStudy.title}</h2>{module.caseStudy.scenario.map((p,i)=><p key={i}>{p}</p>)}
   <div className="lesson-case-task"><strong>Your task</strong><p>{module.caseStudy.task}</p></div>
   <label htmlFor="lesson-case-draft">Your case response</label><textarea id="lesson-case-draft" maxLength={6000} value={drafts.case??''} onChange={e=>setDrafts(x=>({...x,case:e.target.value}))} placeholder="Draft here, or work through the case on paper…"/>
   <p className="lesson-study-note">Temporary local draft only. Use the worked case and checklist for self-review; this answer is not automatically assessed.</p>
   <details><summary>Case hints</summary>{module.caseStudy.hints.map(h=><p key={h}>{h}</p>)}</details>
   <details><summary>Worked case and review checklist</summary><p className="lesson-case-worked-answer">{module.caseStudy.modelAnswer}</p><ul>{module.caseStudy.reviewChecks.map(c=><li key={c}>{c}</li>)}</ul></details>
   <h3>Transfer the skill</h3><p>{module.caseStudy.transfer}</p>
  </section>
  <section className="lesson-study-section" hidden={activeTab!=='Test'} data-testid="lesson-checkpoint">
   <h2>Check your understanding</h2><p>Fixed-answer questions with immediate, local feedback. This is practice against an answer key, not an AI evaluation, mastery score or course completion. {localReviewStage?`This ${localReviewStage} retrieval records only the stage and aggregate checkpoint result in this browser.`:'The optional browser marker records only that you finished this lesson attempt.'}</p>
   <p role="status" className="lesson-local-result" data-testid="local-checkpoint-result">{checked.length} of {module.checkpoint.length} checked · {correct.length} correct in this attempt{onCompleteLocal?localReviewStage?` · ${localReviewStage} review syncs with your account`:' · progress syncs with your account':' · not saved to your profile'}</p>
   {module.checkpoint.map((q,i)=>{const choice=answers[q.id];const result=choice?.checked?checkLocalChoice(q,choice.selected):'unanswered';return <fieldset key={q.id} className="lesson-check-question" data-testid={'checkpoint-question-'+i}>
    <legend>{i+1}. {q.prompt}</legend>{q.options.map((option,n)=><label key={n}><input type="radio" name={q.id} checked={choice?.selected===n} onChange={()=>setAnswers(x=>({...x,[q.id]:{selected:n,checked:false}}))}/><span>{option}</span></label>)}
    <button type="button" disabled={choice?.selected===undefined} onClick={()=>setAnswers(x=>({...x,[q.id]:{...x[q.id],checked:true}}))}>Check answer</button>
    {result!=='unanswered'&&<div className={'lesson-answer-feedback '+result} role="status"><strong>{result==='correct'?'Correct for this question':'Not this option — review the explanation'}</strong><p>{q.explanation}</p><button type="button" onClick={()=>review(feedbackFor(q.id)!.reviewSection)}>Review the related concept</button></div>}
   </fieldset>;})}
   <div className="lesson-checkpoint-actions"><button type="button" onClick={()=>setAnswers({})}>Restart checkpoint</button>{onCompleteLocal?<button type="button" className="lesson-complete-button" disabled={checked.length!==module.checkpoint.length} onClick={()=>onCompleteLocal(correct.length,module.checkpoint.length)}>{localReviewStage?`Save ${localReviewStage} review`:'Finish lesson'}</button>:null}</div>
   {onCompleteLocal&&checked.length!==module.checkpoint.length?<p className="lesson-study-note">Check all {module.checkpoint.length} answers to {localReviewStage?`save this ${localReviewStage} retrieval`:'finish this lesson locally'}. You can retry; the marker records practice, not mastery.</p>:null}
   {localReviewStage?(localReviewCompletion?<div className="lesson-completion-saved" data-testid="local-review-saved"><span role="status">{localReviewStage} review saved to your account · {localReviewCompletion.correct}/{localReviewCompletion.total} correct in this attempt</span><strong>The original lesson completion date remains unchanged.</strong></div>:<p className="lesson-study-note">Original lesson completion saved · complete this checkpoint to close the {localReviewStage} review.</p>):localCompletion?<div className="lesson-completion-saved" data-testid="local-completion-saved"><span role="status">Completed and saved to your account · {localCompletion.correct}/{localCompletion.total} correct in the saved attempt</span>{nextLessonTitle&&onOpenNextLesson?<button type="button" className="lesson-next-button" onClick={onOpenNextLesson}>Continue to {nextLessonTitle}</button>:<strong>All {module.track==='english'?'English':'ACCA'} lessons are now available for review.</strong>}</div>:null}
  </section>
  <section className="lesson-study-section" hidden={activeTab!=='Sources'} data-testid="lesson-sources">
   <h2>Sources, assumptions and coverage</h2><p>{module.scope}</p>
   <p>The linked pages support the stated concepts. Teaching explanations, control suggestions, cases and answer choices are original. The review date is an editorial check, not a guarantee that a source has not changed since.</p>
   {module.sources.map(s=><article key={s.id} className="lesson-source"><a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a><p>{s.supports}</p><small>Reviewed {s.reviewedOn}</small></article>)}
   <p className="lesson-study-note">Local drafts and quiz results are not sent as learner evidence. Live voice use, persisted assessment and complete curriculum coverage remain separate work.</p>
  </section>
 </div>;
}

function grammarTargetFor(module:LessonModule){
 const title=module.title.toLowerCase();
 if(/story|past|experience/.test(title))return 'Past simple for completed events, past continuous for background, and clear sequencing connectors.';
 if(/plan|appointment|meeting|request/.test(title))return 'Indirect questions, modal softening and future forms that make the next step precise.';
 if(/problem|repair|query|correction/.test(title))return 'Present perfect for a current result, evidence-safe language and clear ownership of the next action.';
 if(/interview|status|report|explain/.test(title))return 'Present perfect for experience or status, past simple for a finished example, and calibrated certainty.';
 return 'Sentence structure, tense choice and professional register inside the situation from this lesson.';
}

function pronunciationTargetFor(module:LessonModule){
 const terms=module.terms.slice(0,3).map(term=>term.term).join(', ');
 return `Clear sentence stress, natural pauses and accurate delivery of the key terms: ${terms}.`;
}

function SpeakingPractice({module,pronunciationTarget}:{module:LessonModule;pronunciationTarget:string}){
 const phrase=module.terms[0]?.example??module.caseStudy.transfer;
 const [listening,setListening]=useState(false);
 const [attempts,setAttempts]=useState(0);
 const [transcript,setTranscript]=useState('');
 const [match,setMatch]=useState<number|null>(null);
 const [error,setError]=useState('');
 const recognitionSupported=typeof window!=='undefined'&&Boolean((window as any).SpeechRecognition||(window as any).webkitSpeechRecognition);
 const start=()=>{
  if(!recognitionSupported||listening||attempts>=3)return;
  const Constructor=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
  const recognition=new Constructor();
  recognition.lang='en-IE';recognition.interimResults=false;recognition.continuous=false;recognition.maxAlternatives=1;
  setError('');setTranscript('');setMatch(null);setListening(true);
  recognition.onresult=(event:any)=>{const heard=String(event.results?.[0]?.[0]?.transcript??'');setTranscript(heard);setMatch(wordMatch(phrase,heard));setAttempts(value=>value+1);};
  recognition.onerror=()=>{setError('The browser could not capture this attempt. Check microphone permission and try again.');};
  recognition.onend=()=>setListening(false);
  recognition.start();
 };
 return <div className="speaking-practice">
  <div className="lesson-section-kicker">SPEAKING · 3 GUIDED ATTEMPTS</div><h2>Say it naturally, then transfer the skill</h2>
  <div className="speaking-target"><span>PHRASE TO REPEAT</span><blockquote>{phrase}</blockquote><button type="button" onClick={()=>{if('speechSynthesis'in window){window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(phrase);utterance.lang='en-IE';window.speechSynthesis.speak(utterance);}}}>Listen to the phrase</button></div>
  <div className="speaking-coach-grid"><article><strong>Pronunciation focus</strong><p>{pronunciationTarget}</p></article><article><strong>Transfer challenge</strong><p>{module.caseStudy.transfer}</p></article></div>
  <div className="speaking-recorder"><div><strong>{listening?'Listening…':attempts?`Attempt ${attempts} captured`:'Ready when you are'}</strong><span>{attempts}/3 attempts used</span></div><button type="button" className="lesson-speaking-button" disabled={!recognitionSupported||listening||attempts>=3} onClick={start}>{listening?'Listening…':'● Start speaking'}</button><small>Audio is not saved to Learning Hub history. The transcript disappears when this lesson closes.</small></div>
  {!recognitionSupported?<p className="lesson-hint">Voice recognition is unavailable in this browser. You can still listen and repeat aloud. In English units, the Professor tab provides the live speaking path.</p>:null}
  {error?<p className="lesson-hint" role="status">{error}</p>:null}
  {transcript?<div className="speaking-feedback" role="status"><div><span>WORDS CAPTURED</span><strong>{match}% match</strong></div><p>“{transcript}”</p><p>{match!==null&&match>=85?'Clear capture. Repeat once with natural rhythm, or continue to the transfer challenge.':match!==null&&match>=60?'Most key words were captured. Slow down slightly and stress the content words.':'Try shorter chunks, then reconnect them with one natural pause.'}</p><small>This is transcript matching, not a clinical accent or acoustic-pronunciation score.</small></div>:null}
 </div>;
}

function wordMatch(target:string,heard:string){
 const words=(value:string)=>value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9' ]/g,' ').split(/\s+/).filter(Boolean);
 const expected=words(target),captured=words(heard);if(!expected.length)return 0;
 const remaining=[...captured];let hits=0;
 for(const word of expected){const index=remaining.indexOf(word);if(index>=0){hits++;remaining.splice(index,1);}}
 return Math.round(hits/expected.length*100);
}
