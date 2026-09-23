import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {LOCAL_ACCA_FR_MOCKS,buildLocalMockReviewSchedule,completeLocalMockReview,gradeMockObjectives,mergeLocalMockProgress,parseLocalMockProgress,readLocalMockProgress,recordLocalMockAttempt,writeLocalMockProgress,type LocalMockReviewStage} from '../learning/localMockExam';
import {ACCOUNT_STUDY_NAMESPACES,loadAccountStudyState,saveAccountStudyState} from '../services/accountStudyState';

type Phase='ready'|'running'|'marking'|'saved';
type SyncStatus='loading'|'synced'|'saving'|'local-fallback';
const storage=()=>{try{return typeof window==='undefined'?null:window.localStorage;}catch{return null;}};
const shortDate=(value:string)=>new Intl.DateTimeFormat('en-IE',{day:'2-digit',month:'short'}).format(new Date(value));
const clock=(seconds:number)=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;

export function LocalMockExamView({scope}:{scope:string}){
 const [examId,setExamId]=useState(LOCAL_ACCA_FR_MOCKS[0].id);
 const exam=LOCAL_ACCA_FR_MOCKS.find(candidate=>candidate.id===examId)??LOCAL_ACCA_FR_MOCKS[0];
 const [progress,setProgress]=useState(()=>readLocalMockProgress(storage(),scope));
 const [phase,setPhase]=useState<Phase>('ready');
 const [answers,setAnswers]=useState<Record<string,number>>({});
 const [response,setResponse]=useState('');
 const [awarded,setAwarded]=useState<Record<string,boolean>>({});
 const [remaining,setRemaining]=useState(exam.durationMinutes*60);
 const [reviewStage,setReviewStage]=useState<LocalMockReviewStage|null>(null);
 const [syncStatus,setSyncStatus]=useState<SyncStatus>('loading');
 const progressRef=useRef(progress);
 const saveRevision=useRef(0);
 const startedAt=useRef<number|null>(null);
 const objectiveCorrect=useMemo(()=>gradeMockObjectives(exam,answers),[answers,exam]);
 const objectiveMarkValue=exam.objectiveMarks/exam.objectiveQuestions.length;
 const constructedMarks=exam.constructed.markingGuide.reduce((sum,item)=>sum+(awarded[item.id]?item.marks:0),0);
 const achievedMarks=objectiveCorrect*objectiveMarkValue+constructedMarks;
 const latest=progress.attempts[exam.id]?.at(-1)??null;
 const schedule=useMemo(()=>buildLocalMockReviewSchedule(progress,exam.id),[progress,exam.id]);
 const allAnswered=exam.objectiveQuestions.every(question=>answers[question.id]!==undefined);

 const submit=useCallback(()=>setPhase(current=>current==='running'?'marking':current),[]);
 useEffect(()=>{
  if(phase!=='running')return;
  const timer=window.setInterval(()=>setRemaining(current=>Math.max(0,current-1)),1000);
  return()=>window.clearInterval(timer);
 },[phase]);
 useEffect(()=>{if(phase==='running'&&remaining===0)submit();},[phase,remaining,submit]);
 useEffect(()=>{
  let cancelled=false;const local=readLocalMockProgress(storage(),scope);progressRef.current=local;setProgress(local);setSyncStatus('loading');
  void loadAccountStudyState(scope,ACCOUNT_STUDY_NAMESPACES.mockExam).then(payload=>{
   if(cancelled)return;const remote=parseLocalMockProgress(payload),merged=mergeLocalMockProgress(progressRef.current,remote);progressRef.current=merged;setProgress(merged);writeLocalMockProgress(storage(),merged,scope);
   if(JSON.stringify(merged)!==JSON.stringify(remote)){const revision=++saveRevision.current;setSyncStatus('saving');void saveAccountStudyState(scope,ACCOUNT_STUDY_NAMESPACES.mockExam,merged).then(()=>{if(!cancelled&&revision===saveRevision.current)setSyncStatus('synced');}).catch(()=>{if(!cancelled&&revision===saveRevision.current)setSyncStatus('local-fallback');});}else setSyncStatus('synced');
  }).catch(()=>{if(!cancelled)setSyncStatus('local-fallback');});
  return()=>{cancelled=true;saveRevision.current++;};
 },[scope]);

 const begin=(stage:LocalMockReviewStage|null=null)=>{
  setAnswers({});setResponse('');setAwarded({});setRemaining(exam.durationMinutes*60);setReviewStage(stage);startedAt.current=Date.now();setPhase('running');
 };
 const save=()=>{
  const now=new Date().toISOString();const maximum=exam.objectiveMarks+exam.constructedMarks;
  const next=reviewStage
   ?completeLocalMockReview(progress,exam.id,reviewStage,achievedMarks,maximum,now)
   :recordLocalMockAttempt(progress,exam.id,{id:crypto.randomUUID(),submittedAt:now,objectiveCorrect,objectiveTotal:exam.objectiveQuestions.length,constructedMarks,totalMarks:achievedMarks,elapsedSeconds:Math.min(exam.durationMinutes*60,Math.max(0,Math.round((Date.now()-(startedAt.current??Date.now()))/1000)))});
  progressRef.current=next;writeLocalMockProgress(storage(),next,scope);setProgress(next);setPhase('saved');
  const revision=++saveRevision.current;setSyncStatus('saving');
  void saveAccountStudyState(scope,ACCOUNT_STUDY_NAMESPACES.mockExam,next).then(()=>{if(revision===saveRevision.current)setSyncStatus('synced');}).catch(()=>{if(revision===saveRevision.current)setSyncStatus('local-fallback');});
 };

 if(phase==='ready')return <section className="mock-shell" data-testid="local-mock-exam">
  <div className="mock-library"><div className="section-heading"><div><div className="eyebrow">ACCA FR PRACTICE SET</div><h2>Choose a complementary mini mock</h2></div><span>{LOCAL_ACCA_FR_MOCKS.length} original timed papers</span></div><div className="mock-set-grid">{LOCAL_ACCA_FR_MOCKS.map(candidate=>{const attempts=progress.attempts[candidate.id]?.length??0;return <button type="button" key={candidate.id} data-testid={`mock-set-${candidate.id}`} className={`mock-set-card ${candidate.id===exam.id?'selected':''}`} aria-pressed={candidate.id===exam.id} onClick={()=>setExamId(candidate.id)}><span>{candidate.title}</span><strong>{candidate.subtitle}</strong><small>{candidate.focusAreas.join(' · ')}</small><em>{attempts?`${attempts} saved attempt${attempts===1?'':'s'}`:'Not attempted yet'}</em></button>;})}</div></div>
  <div className="mock-hero"><div><div className="eyebrow">PROVIDER-FREE EXAM PRACTICE</div><h2>{exam.title}</h2><p>{exam.subtitle}</p></div><div className="mock-hero-score"><strong>{exam.durationMinutes}</strong><span>minutes</span><small>{exam.objectiveMarks+exam.constructedMarks} marks</small></div></div>
  <div className="mock-overview-grid">
   <article><span>SECTION A</span><strong>{exam.objectiveQuestions.length} objective questions</strong><small>{exam.objectiveMarks} marks · automatically checked only after submission</small></article>
   <article><span>SECTION B</span><strong>1 constructed response</strong><small>{exam.constructedMarks} marks · self-mark against an explicit guide</small></article>
   <article><span>PRIVACY</span><strong>Account-synced result</strong><small>Only marks and review dates sync. Your written response is discarded when this screen closes.</small></article>
  </div>
  {latest?<div className="mock-latest" data-testid="mock-latest-attempt"><div><span>LATEST ATTEMPT</span><strong>{latest.totalMarks}/{exam.objectiveMarks+exam.constructedMarks} marks</strong><small>{latest.objectiveCorrect}/{latest.objectiveTotal} objective answers correct · {latest.constructedMarks}/{exam.constructedMarks} self-awarded</small></div><button className="primary-btn" onClick={()=>begin()}>Take a new attempt</button></div>:<button className="primary-btn mock-start" onClick={()=>begin()}>Start {exam.durationMinutes}-minute mock</button>}
  <div className="mock-review-plan"><div className="section-heading"><div><div className="eyebrow">SPACED DEBRIEF</div><h3>D+1 · D+7 · D+30</h3></div><span>Scheduled from the latest saved attempt</span></div>
   {schedule.length?<div className="review-list">{schedule.map(item=><div className={`review-row ${item.status==='due'?'local-review-due':''}`} key={item.stage}><span className="review-date">{item.stage}</span><div><strong>{item.status==='due'?'Review due':'Review scheduled'}</strong><span>{shortDate(item.dueAt)} · repeat the mock, then compare your reasoning</span></div><button className={item.status==='due'?'primary-btn':'secondary-btn'} disabled={item.status!=='due'} onClick={()=>begin(item.stage)}>{item.status==='due'?'Start review':'Scheduled'}</button></div>)}</div>:<p className="priority-note"><strong>No review scheduled yet</strong><span>Save the first marked attempt to create the D+1, D+7 and D+30 cycle.</span></p>}
  </div>
 </section>;

 return <section className="mock-shell" data-testid="local-mock-exam">
  <div className={`mock-session-bar ${remaining<=300?'urgent':''}`}><div><span>{reviewStage?`${reviewStage} REVIEW`:'TIMED ATTEMPT'}</span><strong>{exam.title}</strong></div><div className="mock-timer" role="timer" aria-label="Time remaining">{clock(remaining)}</div></div>
  <div className="mock-paper">
   <header><div className="eyebrow">SECTION A · 12 MARKS</div><h2>Objective test questions</h2><p>Select one answer for each question. Feedback stays hidden until you submit the section.</p></header>
   {exam.objectiveQuestions.map((question,index)=><fieldset className="mock-question" key={question.id} data-testid={`mock-question-${index}`} disabled={phase!=='running'}><legend><span>{question.topic}</span>{index+1}. {question.prompt}</legend>{question.options.map((option,optionIndex)=><label key={option}><input type="radio" name={question.id} checked={answers[question.id]===optionIndex} onChange={()=>setAnswers(current=>({...current,[question.id]:optionIndex}))}/><span>{option}</span></label>)}{phase!=='running'?<div className={`mock-feedback ${answers[question.id]===question.correctIndex?'correct':'incorrect'}`}><strong>{answers[question.id]===question.correctIndex?'Correct':'Review this point'}</strong><p>{question.explanation}</p></div>:null}</fieldset>)}
   <header className="mock-section-heading"><div className="eyebrow">SECTION B · 8 MARKS</div><h2>Constructed response</h2></header>
   <div className="mock-scenario">{exam.constructed.scenario.map(line=><p key={line}>{line}</p>)}</div><ol className="mock-requirements">{exam.constructed.requirements.map(item=><li key={item}>{item}</li>)}</ol>
   <label className="mock-response-label" htmlFor="mock-response">Your answer</label><textarea id="mock-response" value={response} disabled={phase!=='running'} maxLength={8000} onChange={event=>setResponse(event.target.value)} placeholder="Show calculations, then write a concise evaluation…"/><p className="lesson-study-note">Temporary draft only. It is not uploaded, automatically graded or saved in local storage.</p>
   {phase==='running'?<div className="mock-submit-row"><span>{Object.keys(answers).length}/{exam.objectiveQuestions.length} objective answers selected</span><button className="primary-btn" disabled={!allAnswered} onClick={submit}>Submit and open marking guide</button></div>:<div className="mock-marking" data-testid="mock-marking-guide"><div className="mock-result"><span>OBJECTIVE RESULT</span><strong>{objectiveCorrect*objectiveMarkValue}/{exam.objectiveMarks}</strong><small>{objectiveCorrect} of {exam.objectiveQuestions.length} correct</small></div><div><div className="eyebrow">SELF-MARK THE CONSTRUCTED RESPONSE</div><h2>Tick only points evidenced in your answer</h2><p>Use the guide honestly. The Learning Hub records your total, not the written response.</p></div>{exam.constructed.markingGuide.map(item=><label className="mock-marking-point" key={item.id}><input type="checkbox" checked={!!awarded[item.id]} disabled={phase==='saved'} onChange={event=>setAwarded(current=>({...current,[item.id]:event.target.checked}))}/><span><strong>{item.label} · {item.marks} mark</strong><small>{item.guidance}</small></span></label>)}<div className="mock-final-score"><div><span>TOTAL</span><strong>{achievedMarks}/{exam.objectiveMarks+exam.constructedMarks}</strong><small>{objectiveCorrect*objectiveMarkValue}/{exam.objectiveMarks} objective · {constructedMarks}/{exam.constructedMarks} constructed</small></div>{phase==='marking'?<button className="primary-btn" onClick={save}>{reviewStage?`Save ${reviewStage} review`:'Save attempt & schedule reviews'}</button>:<button className="secondary-btn" onClick={()=>{setPhase('ready');setReviewStage(null);}}>Back to mock overview</button>}</div>{phase==='saved'?<p role="status" className="lesson-completion-saved" data-testid="mock-result-saved">{reviewStage?`${reviewStage} review`:'Attempt'} {syncStatus==='synced'?'saved to your account.':syncStatus==='local-fallback'?'saved on this device; account sync is temporarily unavailable.':'saved on this device and syncing to your account.'} The written response was not saved.</p>:null}</div>}
  </div>
 </section>;
}
