import { useEffect, useState } from 'react';
import {AppliedPracticePanel} from './AppliedPracticePanel';
import {BrowserLessonReader} from './BrowserLessonReader';
import { lessonModuleFor, type LessonModule } from '../learning/lessonModules';
import {checkLocalChoice} from '../learning/checkLocalChoice';
import {loadReviewedRuntimeModuleFor} from '../learning/loadReviewedRuntimeModule';
import {loadReviewedLesson,type WrittenLoadResult} from '../learning/loadReviewedLesson';
import { STUDY_PACKS, type StudyTrack } from '../learning/teachingPacks';
import type {LocalReviewCompletion,LocalReviewStage} from '../learning/localStudyProgress';
import '../learning/lesson-study.css';

const studyTabs=new Set(['Learn','English','Practice','Visual','Case','Test','Sources']);
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
 return <>{(activeTab==='Learn'||activeTab==='Audio')&&<BrowserLessonReader key={module.lessonId+activeTab} module={module} disabled={readerDisabled}/>}<StudyContent key={module.lessonId} module={module} activeTab={activeTab} onTabChange={onTabChange} onPrepareWorkshop={onPrepareWorkshop} handoffDisabled={handoffDisabled} localCompletion={localCompletion} onCompleteLocal={onCompleteLocal} nextLessonTitle={nextLessonTitle} onOpenNextLesson={onOpenNextLesson} localReviewStage={localReviewStage} localReviewCompletion={localReviewCompletion}/></>;
}
function StudyContent({module,activeTab,onTabChange,onPrepareWorkshop,handoffDisabled,localCompletion,onCompleteLocal,nextLessonTitle,onOpenNextLesson,localReviewStage,localReviewCompletion}:{module:LessonModule;activeTab:string;onTabChange:(tab:string)=>void;onPrepareWorkshop?:(id:string)=>void;handoffDisabled?:boolean;localCompletion?:{completedAt:string;correct:number;total:number};onCompleteLocal?:(correct:number,total:number)=>void;nextLessonTitle?:string;onOpenNextLesson?:()=>void;localReviewStage?:LocalReviewStage;localReviewCompletion?:LocalReviewCompletion}){
 const pack=STUDY_PACKS[module.track];
 const exercises=module.practiceExercises??pack.exercises;
 const [drafts,setDrafts]=useState<Record<string,string>>({});
 const [hints,setHints]=useState<Record<string,number>>({});
 const [revealed,setRevealed]=useState<Record<string,boolean>>({});
 const [answers,setAnswers]=useState<Record<string,{selected?:number;checked?:boolean}>>({});
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
  <section className="lesson-study-section" hidden={activeTab!=='Practice'} data-testid="lesson-practice">
   {module.lessonId===pack.lessonId&&<AppliedPracticePanel key={module.track} track={module.track} onPrepare={onPrepareWorkshop} handoffDisabled={handoffDisabled}/>}
   <h2>Retrieve, then compare</h2><p>Try each question before opening help. Drafts remain while you switch tabs, but disappear when this lesson closes, the page reloads or the account signs out. Avoid confidential information.</p>
   {exercises.map((q,i)=><section className="lesson-exercise" key={q.id} data-testid={'written-practice-'+i}>
    <h3>{i+1}. {q.question}</h3><label htmlFor={'draft-'+q.id}>Your practice draft {i+1}</label>
    <textarea id={'draft-'+q.id} maxLength={6000} value={drafts[q.id]??''} onChange={e=>setDrafts(x=>({...x,[q.id]:e.target.value}))} placeholder="Try explaining it in your own words…"/>
    <div className="lesson-inline-actions"><button type="button" disabled={(hints[q.id]??0)>=2} onClick={()=>setHints(x=>({...x,[q.id]:Math.min(2,(x[q.id]??0)+1)}))}>Reveal a hint</button><button type="button" aria-expanded={revealed[q.id]===true} onClick={()=>setRevealed(x=>({...x,[q.id]:!x[q.id]}))}>{revealed[q.id]?'Hide worked response':'Compare with worked response'}</button></div>
    {q.hints.slice(0,hints[q.id]??0).map((h,n)=><p className="lesson-hint" key={n}>Hint {n+1}: {h}</p>)}
    {revealed[q.id]&&<div className="lesson-worked-response"><strong>One worked response</strong><p>{q.answer}</p><p>{q.explanation}</p><small>Your written draft has not been automatically graded.</small></div>}
   </section>)}
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
   <p className="lesson-study-note">Temporary local draft only. Not submitted or assessed by the Professor.</p>
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
