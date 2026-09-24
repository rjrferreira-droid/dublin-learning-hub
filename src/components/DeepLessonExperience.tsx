import {useMemo, useState, type ReactNode} from 'react';
import {
 type ActivityEvaluation,
 type DeepLessonContract,
 type GrammarItem,
 type ProgressivePracticeItem,
 computeSupportedWorkload,
} from '../learning/deepLessonContract';
import type {LessonModule} from '../learning/lessonModules';
import {BrowserLessonReader} from './BrowserLessonReader';
import {AudioAnswerPractice} from './AudioAnswerPractice';
import {CompactEnglishLearn} from './CompactEnglishLearn';
import {audioQuestionsFor} from '../learning/audioQuestions';
import {curriculumPreviewRuntimeEnabled} from '../config/curriculumPreview';
import '../learning/deep-lesson-experience.css';
import '../learning/deep-lesson-readability.css';
import '../learning/audio-lesson.css';

const DEEP_ITEM_ATTEMPTS=2;
const deepCoreTabs=new Set(['Learn','Audio','Practice']);
const deepEnglishTabs=new Set(['Grammar','Speaking']);

type ResponseState={selected:string[];draft:string;attempts:number;revealed:boolean;correct?:boolean};
type ResponseMap=Record<string,ResponseState>;
type DeepItem=GrammarItem|ProgressivePracticeItem;
type Props={
 module:LessonModule;
 activeTab:string;
 readerDisabled?:boolean;
 audioPlayer?:ReactNode;
 audioListened?:boolean;
 onTabChange:(tab:string)=>void;
 onLearnReviewed:()=>void;
 onGrammarEngaged:()=>void;
 onPracticeEngaged:()=>void;
};

const emptyResponse=():ResponseState=>({selected:[],draft:'',attempts:0,revealed:false});

export function deepLessonHandlesTab(deep:DeepLessonContract,activeTab:string){
 return deepCoreTabs.has(activeTab)||(Boolean(deep.english)&&deepEnglishTabs.has(activeTab));
}

export function DeepLessonExperience({module,activeTab,readerDisabled,audioPlayer,audioListened,onTabChange,onLearnReviewed,onGrammarEngaged,onPracticeEngaged}:Props){
 const deep=module.deepLesson;
 const [responses,setResponses]=useState<ResponseMap>({});
 const [readerOpen,setReaderOpen]=useState(false);
 const [speakingAttempts,setSpeakingAttempts]=useState<Record<string,number>>({});
 const [examDrafts,setExamDrafts]=useState<Record<string,string>>({});
 const learnText=useMemo(()=>module.sections.flatMap(section=>[section.title,...section.paragraphs]).join(' '),[module.sections]);
 const workload=useMemo(()=>deep?computeSupportedWorkload(deep,{learnText}):null,[deep,learnText]);
 const practiceItems=useMemo(()=>{
  if(!deep)return [];
  if(!deep.practice.sessionItemIds?.length)return deep.practice.items;
  const byId=new Map(deep.practice.items.map(item=>[item.id,item]));
  return deep.practice.sessionItemIds.map(id=>byId.get(id)).filter((item):item is ProgressivePracticeItem=>Boolean(item));
 },[deep]);
 if(!deep)return null;
 const english=deep.english;
 const visible=deepLessonHandlesTab(deep,activeTab);

 const updateResponse=(key:string,change:(previous:ResponseState)=>ResponseState)=>setResponses(current=>({
  ...current,
  [key]:change(current[key]??emptyResponse()),
 }));

 const renderItem=(item:DeepItem,index:number,kind:'grammar'|'practice')=>{
  const key=`${kind}:${item.id}`;
  const response=responses[key]??emptyResponse();
  const selection=item.responseMode==='single-select'||item.responseMode==='multi-select';
  const hint='hints' in item?item.hints?.[0]:undefined;
  const source='sourceBucket' in item?item.sourceBucket:null;
  const canSubmit=selection?response.selected.length>0:response.draft.trim().length>=3;
  const submit=()=>{
   if(!canSubmit||response.attempts>=DEEP_ITEM_ATTEMPTS)return;
   updateResponse(key,previous=>{
    const attempts=Math.min(DEEP_ITEM_ATTEMPTS,previous.attempts+1);
    const correct=item.evaluation.kind==='selection'
     ?sameSelection(previous.selected,item.evaluation.correctOptionIds)
     :undefined;
    return {...previous,attempts,correct,revealed:correct===true||attempts>=DEEP_ITEM_ATTEMPTS};
   });
   if(kind==='grammar')onGrammarEngaged();else onPracticeEngaged();
  };
  return <article className="deep-activity-card" key={item.id} data-testid={`deep-${kind}-item-${index}`}>
   <div className="deep-activity-meta">
    <span>{kind==='grammar'&&'stage' in item?grammarStageLabel(item.stage):progressionLabel((item as ProgressivePracticeItem).progression)}</span>
    {source?<span className={`deep-source-tag source-${source}`}>{sourceLabel(source)}</span>:null}
    <span>{item.estimatedMinutes} min</span><span>{response.attempts}/{DEEP_ITEM_ATTEMPTS} attempts</span>
   </div>
   <h4>{index+1}. {item.prompt}</h4>
   {selection?<fieldset className="deep-selection-fieldset"><legend className="sr-only">Choose {item.responseMode==='multi-select'?'one or more answers':'one answer'}</legend>
    {item.options?.map(option=><label key={option.id}>
     <input type={item.responseMode==='multi-select'?'checkbox':'radio'} name={`deep-${key}`} value={option.id} checked={response.selected.includes(option.id)} disabled={response.revealed} onChange={()=>updateResponse(key,previous=>{
      const selected=item.responseMode==='multi-select'
       ?previous.selected.includes(option.id)?previous.selected.filter(id=>id!==option.id):[...previous.selected,option.id]
       :[option.id];
      return {...previous,selected,correct:undefined};
     })}/><span>{option.label}</span>
    </label>)}
   </fieldset>:<label className="deep-written-response" htmlFor={`deep-response-${key}`}>
    <span>{item.responseMode==='calculation'?'Show your calculation and conclusion':item.responseMode==='ordering'?'Write the order and briefly justify it':'Write your response'}</span>
    <textarea id={`deep-response-${key}`} value={response.draft} disabled={response.revealed} maxLength={6000} onChange={event=>updateResponse(key,previous=>({...previous,draft:event.target.value,correct:undefined}))} placeholder="Draft from the evidence in this lesson…"/>
   </label>}
   <div className="lesson-inline-actions"><button type="button" disabled={!canSubmit||response.attempts>=DEEP_ITEM_ATTEMPTS} onClick={submit}>{response.attempts===0?'Submit first attempt':'Submit revised attempt'}</button></div>
   {response.attempts===1&&!response.revealed?<div className="lesson-hint" role="status"><strong>{response.correct===false?'Not yet — one attempt remains.':'Revision step — one attempt remains.'}</strong><p>{hint??(selection?'Re-read the intention and eliminate any option the evidence does not support.':'Check the target, preserve the supplied facts and make your reasoning visible.')}</p></div>:null}
   {response.revealed?<div className={`lesson-answer-feedback ${response.correct===true?'correct':''}`} role="status">
    <strong>{response.correct===true?`Correct on attempt ${response.attempts}.`:selection?'Two attempts used — compare with the authored answer.':'Two drafts recorded — self-review against the authored reference.'}</strong>
    {renderEvaluation(item.evaluation,item.options)}
    {response.correct===false&&item.evidence.errorBank==='after-final-incorrect'?<small>Authored evidence rule: this result is eligible for Error Bank after the final incorrect attempt. This screen does not claim that a record was saved.</small>:null}
   </div>:null}
  </article>;
 };

 return <div className="deep-lesson-experience" hidden={!visible} data-testid="deep-lesson-experience">
  {module.track==='english'?activeTab==='Learn'?<CompactEnglishLearn module={module} onContinue={()=>{onLearnReviewed();onTabChange('Grammar');}}/>:null:<section className="lesson-study-section deep-learn" hidden={activeTab!=='Learn'} data-testid="deep-lesson-learn">
   <div className="deep-title-row"><div><div className="lesson-section-kicker">DEEP LESSON · {editorialLabel(deep.editorial.status)}</div><h2>{module.title}</h2></div><span className="deep-version">Depth {deep.editorial.depthVersion}</span></div>
   <p className="lesson-study-lead">{module.goal}</p>
   <div className="deep-summary-grid">
    <article><span>PLANNED WORKLOAD</span><strong>{deep.workload.totalMinutes} minutes</strong><small>{deep.workload.paceNote??'Work at a pace that leaves time to attempt every activity.'}</small></article>
    <article><span>AUTHORED ACTIVITY AVAILABLE</span><strong>{formatMinutes(workload?.availableMinutes??0)} minutes</strong><small>{deep.audioEpisode.format==='editorial-outline'?'Outline-only Audio is excluded until an independent episode exists.':'Includes the authored Audio script; no generated player is implied.'}</small></article>
    <article><span>CURRICULUM ALIGNMENT</span><strong>{deep.curriculum.framework}</strong><small>{deep.curriculum.version} · {deep.curriculum.outcomeIds.length} mapped outcome{deep.curriculum.outcomeIds.length===1?'':'s'}</small></article>
   </div>
   <section className="deep-orientation-block"><h3>Before you begin</h3><div className="deep-two-column"><div><h4>Prerequisites</h4><ul>{deep.prerequisites.map(item=><li key={item}>{item}</li>)}</ul></div><div><h4>Learning objectives</h4><ol>{deep.objectives.map(objective=><li key={objective.id}>{objective.statement}{objective.level?<small>{objective.level}</small>:null}</li>)}</ol></div></div></section>
   <section className="deep-workload"><h3>Honest workload by phase</h3><p className="lesson-study-note">Times are a plan, not proof of learning. “Available” is computed from the authored activities currently attached to this lesson.</p><div className="deep-phase-grid">{workload?.phases.map((phase,index)=><article key={phase.id}><span>{deep.workload.phases[index]?.title}</span><strong>{phase.plannedMinutes} min planned</strong><small>{formatMinutes(phase.availableMinutes)} min available{phase.unresolvedEvidenceIds.length?` · ${phase.unresolvedEvidenceIds.length} item(s) unresolved`:''}</small></article>)}</div></section>
   <details className="lesson-accessibility-tool" onToggle={event=>setReaderOpen(event.currentTarget.open)}>
    <summary>Accessibility tool · read the Learn text aloud</summary><p className="lesson-study-note">Optional browser read-aloud of this written material. It is not the independent lesson in Audio.</p><BrowserLessonReader module={module} disabled={readerDisabled||!readerOpen||activeTab!=='Learn'}/>
   </details>
   {english?<section className="deep-contextual-input"><h3>{english.contextualInput.title}</h3><span className="deep-mode-tag">{english.contextualInput.mode.replace('-', ' ')}</span><div className="deep-dialogue">{english.contextualInput.turns.map((turn,index)=><p key={`${turn.speaker}-${index}`}><strong>{turn.speaker}</strong><span>{turn.text}</span></p>)}</div></section>:null}
   <nav className="lesson-study-outline" aria-label="Deep written lesson sections">{module.sections.map(section=><a key={section.id} href={`#deep-lesson-section-${section.id}`}>{section.title}</a>)}</nav>
   {module.sections.map(section=><section key={section.id} id={`deep-lesson-section-${section.id}`} className="lesson-teaching-block">
    <h3>{section.title}</h3>{section.paragraphs.map((paragraph,index)=><p key={index}>{paragraph}</p>)}
    <details><summary>Resumo em português</summary><p lang="pt-BR">{section.supportPt}</p></details>
    <div className="lesson-inline-sources">{section.sourceIds.length?section.sourceIds.map(id=>{const source=module.sources.find(item=>item.id===id);return source?<a key={id} href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a>:null;}):<span>Original teaching material.</span>}</div>
   </section>)}
   <section className="deep-worked-examples"><h3>Worked examples</h3>{deep.workedExamples.map((example,index)=><article key={example.id}>
    <div className="deep-card-heading"><span>WORKED EXAMPLE {index+1}</span><strong>{example.estimatedMinutes} min</strong></div><h4>{example.title}</h4><ul>{example.scenario.map(fact=><li key={fact}>{fact}</li>)}</ul>
    <ol className="deep-example-steps">{example.steps.map(step=><li key={step.id}><strong>{step.action}</strong><p>{step.reasoning}</p>{step.calculation?<code>{step.calculation}</code>:null}<p className="deep-step-result">Result: {step.result}</p></li>)}</ol>
    <div className="lesson-worked-response"><strong>Conclusion</strong><p>{example.conclusion}</p>{example.transferPrompt?<p><b>Transfer:</b> {example.transferPrompt}</p>:null}</div>
   </article>)}</section>
   <section className="deep-misconceptions"><h3>Common misconceptions</h3>{deep.misconceptions.map(item=><article key={item.id}><strong>{item.misconception}</strong><p>{item.correction}</p><small>Diagnostic: {item.diagnosticPrompt}</small></article>)}</section>
   <div className="lesson-phase-confirmation"><strong>Close Learn deliberately</strong><p>Review the objectives and examples before retrieval. This records engagement only; it is not a mastery score.</p><button type="button" onClick={()=>{onLearnReviewed();onTabChange('Practice');}}>Mark Learn reviewed &amp; continue</button></div>
  </section>}

  <section className="lesson-study-section deep-audio" hidden={activeTab!=='Audio'} data-testid="deep-lesson-audio">
   <div className="lesson-section-kicker">AUDIO</div><h2>{deep.audioEpisode.title}</h2>
   <p className="lesson-study-lead">{module.track==='english'?'Listen for the main event, what changed, and why the ending matters.':'Listen for the decision, its supporting evidence, and what remains uncertain.'}</p>
   {audioPlayer??<p role="status">The audio for this lesson is being prepared.</p>}
   <details className="audio-transcript"><summary>Follow along with the transcript</summary>
    {deep.audioEpisode.format==='authored-script'?deep.audioEpisode.segments.map(segment=><section key={segment.id}><h3>{segment.title}</h3>{splitScript(segment.script).map((paragraph,paragraphIndex)=><p key={paragraphIndex}>{paragraph.replace(/\s*\[Pause \d+ seconds?\.\]/gi,'')}</p>)}</section>):<p>The full episode is not published yet.</p>}
   </details>
   {module.track==='english'?<AudioAnswerPractice key={module.lessonId} lessonId={module.lessonId} questions={audioQuestionsFor(module.lessonId)} active={activeTab==='Audio'} canRecord={Boolean(audioListened)} previewAllowed={curriculumPreviewRuntimeEnabled}/>:null}
  </section>

  {english?<section className="lesson-study-section deep-grammar" hidden={activeTab!=='Grammar'} data-testid="deep-lesson-grammar">
   <div className="lesson-section-kicker">GRAMMAR · NOTICE → UNDERSTAND → CHOOSE → BUILD → USE</div><h2>{english.grammar.target}</h2><p>Complete every authored item. Selection answers use a fixed key; written answers are never auto-scored. Each item allows two attempts before its reference is shown.</p>
   {english.grammar.stages.map(stage=>{
    const items=stage.itemIds.map(id=>english.grammar.items.find(item=>item.id===id)).filter((item):item is GrammarItem=>Boolean(item));
    return <section className="deep-grammar-stage" key={stage.stage} data-stage={stage.stage}><div className="deep-stage-heading"><span>{grammarStageLabel(stage.stage)}</span><p>{stage.purpose}</p></div>{items.map(item=>renderItem(item,english.grammar.items.indexOf(item),'grammar'))}</section>;
   })}
   {english.grammar.items.filter(item=>!english.grammar.stages.some(stage=>stage.itemIds.includes(item.id))).map(item=>renderItem(item,english.grammar.items.indexOf(item),'grammar'))}
  </section>:null}

  <section className="lesson-study-section deep-practice" hidden={activeTab!=='Practice'} data-testid="deep-lesson-practice">
   <div className="lesson-section-kicker">PRACTICE · MIXED RETRIEVAL AND APPLICATION</div><h2>Retrieve, revise, then compare</h2><p>Selection and written tasks are labelled by source. You receive two genuine attempts before the authored answer, rubric or checklist appears.</p>
   <div className="deep-practice-mix">{(['current','previous','confirmed-error-bank'] as const).map(bucket=><article key={bucket}><span>{sourceLabel(bucket)}</span><strong>{practiceItems.filter(item=>item.sourceBucket===bucket).length}</strong><small>{deep.practice.targetMix?`${Math.round(deep.practice.targetMix[bucket]*100)}% target`:bucket==='current'?'Current lesson':'Retrieval source'}</small></article>)}</div>
   {(['current','previous','confirmed-error-bank'] as const).map(bucket=>{
    const items=practiceItems.filter(item=>item.sourceBucket===bucket);
    if(!items.length)return null;
    return <section className="deep-practice-bucket" key={bucket} data-source={bucket}><div className="deep-stage-heading"><span>{sourceLabel(bucket)}</span><p>{practiceBucketPurpose(bucket)}</p></div>{items.map(item=>renderItem(item,deep.practice.items.indexOf(item),'practice'))}</section>;
   })}
   {deep.acca?.examTechnique?.length?<section className="deep-exam-technique"><h3>Exam technique</h3><ol>{deep.acca.examTechnique.map(item=><li key={item}>{item}</li>)}</ol></section>:null}
   {deep.examTasks?.length?<section className="deep-exam-tasks"><h3>Exam-style tasks</h3><p className="lesson-study-note">Use the marks and time limit to plan depth. Draft first; then open the marking guide for self-review.</p>{deep.examTasks.map((task,index)=><article key={task.id} data-testid={`deep-exam-task-${index}`}>
    <div className="deep-card-heading"><span>{task.totalMarks} marks</span><strong>{task.timeLimitMinutes} minutes</strong></div><h4>{task.title}</h4>{task.scenario.map(paragraph=><p key={paragraph}>{paragraph}</p>)}
    <ol className="deep-exam-requirements">{task.requirements.map(requirement=><li key={requirement.id}><span>{requirement.prompt}</span><strong>{requirement.marks} marks</strong></li>)}</ol>
    <label className="deep-written-response" htmlFor={`deep-exam-${task.id}`}><span>Your timed response</span><textarea id={`deep-exam-${task.id}`} value={examDrafts[task.id]??''} onChange={event=>setExamDrafts(current=>({...current,[task.id]:event.target.value}))} maxLength={12000} placeholder="Write or outline your answer before opening the guide…"/></label>
    <details><summary>Marking guide · {task.totalMarks} marks</summary><div className="lesson-table-wrap" role="region" aria-label={`${task.title} marking guide`} tabIndex={0}><table><thead><tr><th scope="col">Criterion</th><th scope="col">Marks</th><th scope="col">Common miss</th></tr></thead><tbody>{task.markingGuide.map(row=><tr key={row.id}><td>{row.criterion}</td><td>{row.marks}</td><td>{row.commonMiss??'—'}</td></tr>)}</tbody></table></div>{task.modelAnswer?<div className="lesson-worked-response"><strong>Model answer</strong><p>{task.modelAnswer}</p></div>:null}</details>
   </article>)}</section>:null}
   {deep.revisionTargets.length?<section className="deep-revision-targets"><h3>Scheduled retrieval targets</h3>{deep.revisionTargets.map(target=><article key={target.id}><strong>{target.prompt}</strong><p>{target.successCriterion}</p><small>Revisit after {target.revisitAfterDays.join(', ')} day{target.revisitAfterDays.length===1?'':'s'} · {target.estimatedMinutes} min</small></article>)}</section>:null}
   <section className="deep-completion-plan"><h3>What completion means</h3><ul>{deep.completion.requirements.map(requirement=><li key={requirement.id}>{completionRuleLabel(requirement.rule)}: {requirement.targetIds.length} item{requirement.targetIds.length===1?'':'s'}{requirement.minimum!==undefined?` · minimum ${requirement.minimum}`:''}</li>)}</ul><p className="lesson-study-note">Item-level evidence is {deep.completion.itemLevelEvidenceRequired?'required':'not required'} by the authored contract. This local screen does not invent saved evidence or claim mastery.</p></section>
  </section>

  {english?<section className="lesson-study-section deep-speaking" hidden={activeTab!=='Speaking'} data-testid="deep-lesson-speaking">
   <div className="lesson-section-kicker">SPEAKING · CHUNKS, STRESS, LINKING, SHADOWING, TRANSFER</div><h2>Build intelligibility without a fake score</h2><div className="lesson-audio-state"><strong>No acoustic percentage is calculated</strong><p>This screen logs only a local rehearsal count. It does not infer accent quality, phoneme accuracy, fluency or CEFR level. {english.speaking.recordingRetention==='discard-after-feedback'?'The authored policy requires any future voice capture to be discarded after feedback.':'The authored policy allows recordings in learner history.'}</p></div>
   {english.speaking.tasks.map((task,index)=>{const attempts=speakingAttempts[task.id]??0;return <article className="deep-speaking-task" key={task.id} data-testid={`deep-speaking-task-${index}`}>
    <div className="deep-card-heading"><span>{speakingFocusLabel(task.focus)}</span><strong>{task.estimatedMinutes} min</strong></div><h3>{task.prompt}</h3>{task.model?<blockquote>{task.model}</blockquote>:null}<p className="lesson-study-note">Practise aloud. Listen for the named focus and repeat before moving to transfer.</p><button type="button" disabled={attempts>=english.speaking.attemptsPerTask} onClick={()=>setSpeakingAttempts(current=>({...current,[task.id]:Math.min(english.speaking.attemptsPerTask,(current[task.id]??0)+1)}))}>Mark rehearsal attempt · {attempts}/{english.speaking.attemptsPerTask}</button>
   </article>})}
  </section>:null}
 </div>;
}

function sameSelection(actual:readonly string[],expected:readonly string[]){
 return actual.length===expected.length&&actual.every(id=>expected.includes(id));
}

function renderEvaluation(evaluation:ActivityEvaluation,options:DeepItem['options']){
 if(evaluation.kind==='selection'){
  const labels=evaluation.correctOptionIds.map(id=>options?.find(option=>option.id===id)?.label??id);
  return <><p><strong>Authored answer:</strong> {labels.join('; ')}</p><p>{evaluation.explanation}</p></>;
 }
 if(evaluation.kind==='answer-key')return <><p><strong>Accepted reference answer{evaluation.acceptedAnswers.length===1?'':'s'}:</strong> {evaluation.acceptedAnswers.join(' · ')}</p><p>{evaluation.explanation}</p></>;
 if(evaluation.kind==='rubric')return <><ul>{evaluation.criteria.map(criterion=><li key={criterion.id}>{criterion.description}{criterion.points!==undefined?` (${criterion.points} points)`:''}</li>)}</ul>{evaluation.modelAnswer?<p><strong>Model:</strong> {evaluation.modelAnswer}</p>:null}</>;
 return <><ul>{evaluation.checklist.map(item=><li key={item}>{item}</li>)}</ul>{evaluation.modelAnswer?<p><strong>Model:</strong> {evaluation.modelAnswer}</p>:null}</>;
}

const formatMinutes=(minutes:number)=>minutes.toLocaleString('en-IE',{maximumFractionDigits:1});
const splitScript=(script:string)=>script.split(/\n+/).map(item=>item.trim()).filter(Boolean);
const editorialLabel=(status:DeepLessonContract['editorial']['status'])=>status==='deep-reviewed'?'DEEP REVIEWED':status==='published'?'PUBLISHED':'EDITORIAL DRAFT';
const grammarStageLabel=(stage:string)=>({notice:'NOTICE',understand:'UNDERSTAND',choose:'CHOOSE',build:'BUILD',use:'USE'}[stage]??stage.toUpperCase());
const progressionLabel=(stage:ProgressivePracticeItem['progression'])=>({retrieve:'RETRIEVE',explain:'EXPLAIN',apply:'APPLY',integrate:'INTEGRATE',transfer:'TRANSFER',exam:'EXAM'}[stage]);
const sourceLabel=(source:ProgressivePracticeItem['sourceBucket'])=>({current:'Current unit',previous:'Previous units','confirmed-error-bank':'Error review slot'}[source]);
const practiceBucketPurpose=(source:ProgressivePracticeItem['sourceBucket'])=>({current:'Apply the concept you are studying now.',previous:'Retrieve earlier learning instead of relying on recognition.', 'confirmed-error-bank':'Use a confirmed learner error only when one is connected; otherwise the item must identify itself as a diagnostic substitute and must not change Error Bank.'}[source]);
const speakingFocusLabel=(focus:DeepLessonContract['english'] extends infer _Never?string:string)=>focus.replace('-', ' ').toUpperCase();
const completionRuleLabel=(rule:DeepLessonContract['completion']['requirements'][number]['rule'])=>({view:'View',attempt:'Attempt',submit:'Submit','meet-threshold':'Meet threshold'}[rule]);
