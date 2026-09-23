import {useCallback,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {LOCAL_ACCA_FR_PRACTICE,buildLocalMockReviewSchedule,completeLocalMockReview,constructedResponsesFor,gradeMockObjectives,mergeLocalMockProgress,objectiveQuestionsFor,parseLocalMockProgress,readLocalMockProgress,recordLocalMockAttempt,writeLocalMockProgress,type LocalMockReviewStage,type MockObjectiveQuestion} from '../learning/localMockExam';
import {ACCOUNT_STUDY_NAMESPACES,loadAccountStudyState,saveAccountStudyState} from '../services/accountStudyState';

type Phase='ready'|'running'|'marking'|'saved';
type SyncStatus='loading'|'synced'|'saving'|'local-fallback';
const storage=()=>{try{return typeof window==='undefined'?null:window.localStorage;}catch{return null;}};
const shortDate=(value:string)=>new Intl.DateTimeFormat('en-IE',{day:'2-digit',month:'short'}).format(new Date(value));
const clock=(seconds:number)=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
function TimedAttemptClock({durationMinutes,active,onExpire}:{durationMinutes:number;active:boolean;onExpire:()=>void}){
 const [remaining,setRemaining]=useState(durationMinutes*60);
 useEffect(()=>{if(!active)return;const timer=window.setInterval(()=>setRemaining(current=>Math.max(0,current-1)),1000);return()=>window.clearInterval(timer);},[active]);
 useEffect(()=>{if(active&&remaining===0)onExpire();},[active,remaining,onExpire]);
 return <div className={`mock-timer ${remaining<=300?'urgent':''}`} role="timer" aria-label="Time remaining">{clock(remaining)}</div>;
}

export function LocalMockExamView({scope}:{scope:string}){
 const [examId,setExamId]=useState(LOCAL_ACCA_FR_PRACTICE[0].id);
 const exam=LOCAL_ACCA_FR_PRACTICE.find(candidate=>candidate.id===examId)??LOCAL_ACCA_FR_PRACTICE[0];
 const objectiveQuestions=useMemo(()=>objectiveQuestionsFor(exam),[exam]);
 const constructedResponses=useMemo(()=>constructedResponsesFor(exam),[exam]);
 const [progress,setProgress]=useState(()=>readLocalMockProgress(storage(),scope));
 const [phase,setPhase]=useState<Phase>('ready');
 const [answers,setAnswers]=useState<Record<string,number>>({});
 const [responses,setResponses]=useState<Record<string,string>>({});
 const [awarded,setAwarded]=useState<Record<string,boolean>>({});
 const [reviewStage,setReviewStage]=useState<LocalMockReviewStage|null>(null);
 const [syncStatus,setSyncStatus]=useState<SyncStatus>('loading');
 const progressRef=useRef(progress);
 const saveRevision=useRef(0);
 const startedAt=useRef<number|null>(null);
 const objectiveCorrect=useMemo(()=>gradeMockObjectives(exam,answers),[answers,exam]);
 const objectiveMarkValue=exam.objectiveMarks/objectiveQuestions.length;
 const markingGuide=constructedResponses.flatMap(item=>item.markingGuide);
 const constructedMarks=markingGuide.reduce((sum,item)=>sum+(awarded[item.id]?item.marks:0),0);
 const achievedMarks=objectiveCorrect*objectiveMarkValue+constructedMarks;
 const latest=progress.attempts[exam.id]?.at(-1)??null;
 const schedule=useMemo(()=>buildLocalMockReviewSchedule(progress,exam.id),[progress,exam.id]);
 const allAnswered=objectiveQuestions.every(question=>answers[question.id]!==undefined);

 const submit=useCallback(()=>setPhase(current=>current==='running'?'marking':current),[]);
 useEffect(()=>{
  let cancelled=false;const local=readLocalMockProgress(storage(),scope);progressRef.current=local;setProgress(local);setSyncStatus('loading');
  void loadAccountStudyState(scope,ACCOUNT_STUDY_NAMESPACES.mockExam).then(payload=>{
   if(cancelled)return;const remote=parseLocalMockProgress(payload),merged=mergeLocalMockProgress(progressRef.current,remote);progressRef.current=merged;setProgress(merged);writeLocalMockProgress(storage(),merged,scope);
   if(JSON.stringify(merged)!==JSON.stringify(remote)){const revision=++saveRevision.current;setSyncStatus('saving');void saveAccountStudyState(scope,ACCOUNT_STUDY_NAMESPACES.mockExam,merged).then(()=>{if(!cancelled&&revision===saveRevision.current)setSyncStatus('synced');}).catch(()=>{if(!cancelled&&revision===saveRevision.current)setSyncStatus('local-fallback');});}else setSyncStatus('synced');
  }).catch(()=>{if(!cancelled)setSyncStatus('local-fallback');});
  return()=>{cancelled=true;saveRevision.current++;};
 },[scope]);

 const begin=(stage:LocalMockReviewStage|null=null)=>{
  setAnswers({});setResponses({});setAwarded({});setReviewStage(stage);startedAt.current=Date.now();setPhase('running');
 };
 const save=()=>{
  const now=new Date().toISOString();const maximum=exam.objectiveMarks+exam.constructedMarks;
  const next=reviewStage
   ?completeLocalMockReview(progress,exam.id,reviewStage,achievedMarks,maximum,now)
   :recordLocalMockAttempt(progress,exam.id,{id:crypto.randomUUID(),submittedAt:now,objectiveCorrect,objectiveTotal:objectiveQuestions.length,constructedMarks,totalMarks:achievedMarks,elapsedSeconds:Math.min(exam.durationMinutes*60,Math.max(0,Math.round((Date.now()-(startedAt.current??Date.now()))/1000)))});
  progressRef.current=next;writeLocalMockProgress(storage(),next,scope);setProgress(next);setPhase('saved');
  const revision=++saveRevision.current;setSyncStatus('saving');
  void saveAccountStudyState(scope,ACCOUNT_STUDY_NAMESPACES.mockExam,next).then(()=>{if(revision===saveRevision.current)setSyncStatus('synced');}).catch(()=>{if(revision===saveRevision.current)setSyncStatus('local-fallback');});
 };
 const renderQuestions=(questions:readonly MockObjectiveQuestion[],startIndex:number):ReactNode=>questions.map((question,index)=><fieldset className="mock-question" key={question.id} data-testid={`mock-question-${startIndex+index}`} disabled={phase!=='running'}><legend><span>{question.topic}</span>{startIndex+index+1}. {question.prompt}</legend>{question.options.map((option,optionIndex)=><label key={option}><input type="radio" name={question.id} checked={answers[question.id]===optionIndex} onChange={()=>setAnswers(current=>({...current,[question.id]:optionIndex}))}/><span>{option}</span></label>)}{phase!=='running'?<div className={`mock-feedback ${answers[question.id]===question.correctIndex?'correct':'incorrect'}`}><strong>{answers[question.id]===question.correctIndex?'Correct':'Review this point'}</strong><p>{question.explanation}</p></div>:null}</fieldset>);

 if(phase==='ready')return <section className="mock-shell" data-testid="local-mock-exam">
  <div className="mock-library"><div className="section-heading"><div><div className="eyebrow">ACCA FR PRACTICE SET</div><h2>Choose a partial drill or full simulation</h2></div><span>{LOCAL_ACCA_FR_PRACTICE.length} original timed practices</span></div><div className="mock-set-grid">{LOCAL_ACCA_FR_PRACTICE.map(candidate=>{const attempts=progress.attempts[candidate.id]?.length??0;return <button type="button" key={candidate.id} data-testid={`mock-set-${candidate.id}`} className={`mock-set-card ${candidate.id===exam.id?'selected':''}`} aria-pressed={candidate.id===exam.id} onClick={()=>setExamId(candidate.id)}><span>{candidate.format==='full'?'FULL 3-HOUR SIMULATION':'PARTIAL 30-MINUTE DRILL'}</span><strong>{candidate.title}</strong><small>{candidate.focusAreas.join(' · ')}</small><em>{attempts?`${attempts} saved attempt${attempts===1?'':'s'}`:'Not attempted yet'}</em></button>;})}</div></div>
  <div className="mock-hero"><div><div className="eyebrow">PROVIDER-FREE EXAM PRACTICE</div><h2>{exam.title}</h2><p>{exam.subtitle}</p></div><div className="mock-hero-score"><strong>{exam.durationMinutes}</strong><span>minutes</span><small>{exam.objectiveMarks+exam.constructedMarks} marks</small></div></div>
  <p className="mock-equivalence-note" data-testid="mock-equivalence-notice"><strong>{exam.format==='full'?'Blueprint matched':'Partial practice'}.</strong> {exam.equivalenceNotice}</p>
  <div className={`mock-overview-grid ${exam.format==='full'?'full':''}`}>
   {exam.format==='full'?<><article><span>SECTION A</span><strong>15 objective questions</strong><small>30 marks · two marks each</small></article><article><span>SECTION B</span><strong>3 cases × 5 questions</strong><small>30 marks · two marks each</small></article><article><span>SECTION C</span><strong>2 constructed responses</strong><small>40 marks · interpretation and preparation</small></article></>:<><article><span>OBJECTIVE DRILL</span><strong>{objectiveQuestions.length} objective questions</strong><small>{exam.objectiveMarks} marks · partial practice, not official Section A</small></article><article><span>CONSTRUCTED DRILL</span><strong>1 constructed response</strong><small>{exam.constructedMarks} marks · partial practice, not official Section C</small></article></>}
   <article><span>PRIVACY</span><strong>Account-synced result</strong><small>Only marks and review dates sync. Written responses are discarded when this screen closes.</small></article>
  </div>
  {latest?<div className="mock-latest" data-testid="mock-latest-attempt"><div><span>LATEST ATTEMPT</span><strong>{latest.totalMarks}/{exam.objectiveMarks+exam.constructedMarks} marks</strong><small>{latest.objectiveCorrect}/{latest.objectiveTotal} objective answers correct · {latest.constructedMarks}/{exam.constructedMarks} self-awarded</small></div><button className="primary-btn" onClick={()=>begin()}>Take a new attempt</button></div>:<button className="primary-btn mock-start" onClick={()=>begin()}>Start {exam.format==='full'?'full simulation':`${exam.durationMinutes}-minute drill`}</button>}
  <div className="mock-review-plan"><div className="section-heading"><div><div className="eyebrow">SPACED DEBRIEF</div><h3>D+1 · D+7 · D+30</h3></div><span>Scheduled from the latest saved attempt</span></div>
   {schedule.length?<div className="review-list">{schedule.map(item=><div className={`review-row ${item.status==='due'?'local-review-due':''}`} key={item.stage}><span className="review-date">{item.stage}</span><div><strong>{item.status==='due'?'Review due':'Review scheduled'}</strong><span>{shortDate(item.dueAt)} · repeat the practice, then compare your reasoning</span></div><button className={item.status==='due'?'primary-btn':'secondary-btn'} disabled={item.status!=='due'} onClick={()=>begin(item.stage)}>{item.status==='due'?'Start review':'Scheduled'}</button></div>)}</div>:<p className="priority-note"><strong>No review scheduled yet</strong><span>Save the first marked attempt to create the D+1, D+7 and D+30 cycle.</span></p>}
  </div>
 </section>;

 return <section className="mock-shell" data-testid="local-mock-exam">
  <div className="mock-session-bar"><div><span>{reviewStage?`${reviewStage} REVIEW`:'TIMED ATTEMPT'}</span><strong>{exam.title}</strong></div><TimedAttemptClock durationMinutes={exam.durationMinutes} active={phase==='running'} onExpire={submit}/></div>
  <div className="mock-paper">
   {exam.format==='mini'?<><header><div className="eyebrow">OBJECTIVE DRILL · {exam.objectiveMarks} MARKS</div><h2>Partial objective practice</h2><p>This is not an official exam section. Select one answer for each question; feedback stays hidden until submission.</p></header>{renderQuestions(exam.objectiveQuestions,0)}</>:<><header><div className="eyebrow">SECTION A · 30 MARKS</div><h2>15 objective test questions</h2><p>Answer all questions. Each question is worth two marks.</p></header>{renderQuestions(exam.sectionAQuestions,0)}<header className="mock-section-heading"><div className="eyebrow">SECTION B · 30 MARKS</div><h2>Three case sets</h2><p>Each case has five objective questions worth two marks each.</p></header>{exam.sectionBCases.map((caseSet,caseIndex)=><section className="mock-case-set" key={caseSet.id} data-testid={`mock-case-${caseIndex+1}`}><h3>{caseSet.title}</h3><div className="mock-scenario">{caseSet.scenario.map(line=><p key={line}>{line}</p>)}</div>{renderQuestions(caseSet.questions,15+caseIndex*5)}</section>)}</>}
   <header className="mock-section-heading"><div className="eyebrow">{exam.format==='full'?'SECTION C · 40 MARKS':`CONSTRUCTED DRILL · ${exam.constructedMarks} MARKS`}</div><h2>{exam.format==='full'?'Two constructed responses':'One partial constructed response'}</h2></header>
   {constructedResponses.map((constructed,index)=><section className="mock-constructed" key={constructed.id} data-testid={`mock-constructed-${index+1}`}><h3>{constructed.title}</h3><div className="mock-scenario">{constructed.scenario.map(line=><p key={line}>{line}</p>)}</div><ol className="mock-requirements">{constructed.requirements.map(item=><li key={item}>{item}</li>)}</ol><label className="mock-response-label" htmlFor={`mock-response-${constructed.id}`}>Your answer</label><textarea id={`mock-response-${constructed.id}`} value={responses[constructed.id]??''} disabled={phase!=='running'} maxLength={16000} onChange={event=>setResponses(current=>({...current,[constructed.id]:event.target.value}))} placeholder="Show calculations and explain your conclusions…"/><p className="lesson-study-note">Temporary draft only. It is not uploaded, automatically graded or saved in local storage.</p></section>)}
   {phase==='running'?<div className="mock-submit-row"><span>{Object.keys(answers).length}/{objectiveQuestions.length} objective answers selected</span><button className="primary-btn" disabled={!allAnswered} onClick={submit}>Submit and open marking guide</button></div>:<div className="mock-marking" data-testid="mock-marking-guide"><div className="mock-result"><span>OBJECTIVE RESULT</span><strong>{objectiveCorrect*objectiveMarkValue}/{exam.objectiveMarks}</strong><small>{objectiveCorrect} of {objectiveQuestions.length} correct</small></div><div><div className="eyebrow">SELF-MARK THE CONSTRUCTED RESPONSE{constructedResponses.length===1?'':'S'}</div><h2>Tick only points evidenced in your answer</h2><p>Use the guide honestly. The Learning Hub records your total, not written responses.</p></div>{constructedResponses.map(constructed=><section className="mock-marking-section" key={constructed.id}><h3>{constructed.title} · {constructed.markingGuide.reduce((sum,item)=>sum+item.marks,0)} marks</h3>{constructed.markingGuide.map(item=><label className="mock-marking-point" key={item.id}><input type="checkbox" checked={!!awarded[item.id]} disabled={phase==='saved'} onChange={event=>setAwarded(current=>({...current,[item.id]:event.target.checked}))}/><span><strong>{item.label} · {item.marks} mark{item.marks===1?'':'s'}</strong><small>{item.guidance}</small></span></label>)}</section>)}<div className="mock-final-score"><div><span>TOTAL</span><strong>{achievedMarks}/{exam.objectiveMarks+exam.constructedMarks}</strong><small>{objectiveCorrect*objectiveMarkValue}/{exam.objectiveMarks} objective · {constructedMarks}/{exam.constructedMarks} constructed</small></div>{phase==='marking'?<button className="primary-btn" onClick={save}>{reviewStage?`Save ${reviewStage} review`:'Save attempt & schedule reviews'}</button>:<button className="secondary-btn" onClick={()=>{setPhase('ready');setReviewStage(null);}}>Back to practice overview</button>}</div>{phase==='saved'?<p role="status" className="lesson-completion-saved" data-testid="mock-result-saved">{reviewStage?`${reviewStage} review`:'Attempt'} {syncStatus==='synced'?'saved to your account.':syncStatus==='local-fallback'?'saved on this device; account sync is temporarily unavailable.':'saved on this device and syncing to your account.'} Written responses were not saved.</p>:null}</div>}
  </div>
 </section>;
}
