import {useState} from 'react';
import {WORKSHOP_CASES,checkWorkshopField,workedValue,type WorkshopTrack,type WorkshopCase} from '../learning/appliedPractice';
import '../learning/applied-practice.css';
export function AppliedPracticePanel({track,onPrepare,handoffDisabled=false}:{track:WorkshopTrack;onPrepare?:(id:string)=>void;handoffDisabled?:boolean}){
 const cases=WORKSHOP_CASES[track];const [index,setIndex]=useState(0);
 return <section className="applied-practice" data-testid="applied-practice" aria-label="Applied practice workshop">
  <header><span>APPLICATION WORKSHOP</span><h2>Try it, inspect the feedback, then explain</h2><p>Three original scenarios for this course. Only the structured answers are checked locally. Your explanation is not automatically assessed.</p></header>
  <label className="workshop-case-picker">Choose a workshop scenario<select value={index} onChange={e=>setIndex(Number(e.target.value))}>{cases.map((c,i)=><option key={c.id} value={i}>{i+1}. {c.title}</option>)}</select></label>
  <p className="workshop-scope">Changing scenario clears this workshop attempt. Switching lesson tabs keeps it; closing the lesson or reloading discards it. Your answers and local results are not saved to your learning profile or sent to the Professor.</p>
  {onPrepare&&<div className="workshop-handoff" data-testid="workshop-handoff">
   <button type="button" disabled={handoffDisabled} onClick={()=>{if(!handoffDisabled)onPrepare(cases[index].id);}}>Prepare this scenario with Professor</button>
   <p>{handoffDisabled?'A current session or account restriction prevents changing the Professor scenario. Local practice remains available.':'This prepares only the scenario identifier for your next Start. No call starts, and your written answers, hints used and local results are not sent.'}</p>
  </div>}
  <WorkshopAttempt key={cases[index].id} exercise={cases[index]}/>
 </section>;
}
function WorkshopAttempt({exercise}:{exercise:WorkshopCase}){
 const [values,setValues]=useState<Record<string,string>>({});const [checked,setChecked]=useState(false);
 const [hintCount,setHintCount]=useState(0);const [showWorked,setShowWorked]=useState(false);const [reasoning,setReasoning]=useState('');
 const ready=exercise.fields.every(f=>!['unanswered','invalid'].includes(checkWorkshopField(f,values[f.id])));
 const correct=exercise.fields.filter(f=>checkWorkshopField(f,values[f.id])==='correct').length;
 function reset(){setValues({});setChecked(false);setHintCount(0);setShowWorked(false);setReasoning('');}
 return <div data-testid="workshop-attempt">
  <h3>{exercise.title}</h3><p className="workshop-scope">{exercise.scope}</p>
  <div className="workshop-facts">{exercise.facts.map((fact,i)=><p key={i}>{fact}</p>)}</div>
  {exercise.track!=='english'&&<p className="workshop-format">Enter amounts without thousands separators: 2512 or 2512.00 (comma decimals also accepted). Use a minus sign for a negative difference.</p>}
  <form onSubmit={e=>{e.preventDefault();setChecked(true);}}>
   <div className="workshop-fields">{exercise.fields.map((field,i)=>{
    const result=checked?checkWorkshopField(field,values[field.id]):null;const id=exercise.id+'-'+field.id;
    return <div className="workshop-field" key={field.id} data-testid={'workshop-field-'+i}>
     <label htmlFor={id}>{field.label}</label>
     {field.kind==='amount'?<input id={id} type="text" inputMode="decimal" autoComplete="off" maxLength={24} value={values[field.id]??''} aria-describedby={result?id+'-feedback':undefined} onChange={e=>{setValues(v=>({...v,[field.id]:e.target.value}));setChecked(false);}}/>:<select id={id} value={values[field.id]??''} aria-describedby={result?id+'-feedback':undefined} onChange={e=>{setValues(v=>({...v,[field.id]:e.target.value}));setChecked(false);}}><option value="">Choose a sentence…</option>{field.options.map((s,n)=><option key={n} value={n}>{s}</option>)}</select>}
     {result&&<p id={id+'-feedback'} className={'workshop-feedback '+result}>{result==='correct'?'Matches this scenario.':result==='review'?field.explanation:result==='invalid'?'Check the input format; no result was assigned to this field.':'Make an attempt here; an empty field is not counted as a wrong answer.'}</p>}
    </div>;
   })}</div>
   <button type="submit">Check this workshop attempt</button>
  </form>
  {checked&&<p role="status" data-testid="workshop-result">{ready?`${correct} of ${exercise.fields.length} structured answers match this scenario.`:'Complete valid entries before interpreting a workshop result.'} Local practice only — not a saved score or evidence of mastery.</p>}
  <div className="workshop-actions"><button type="button" disabled={hintCount===2} onClick={()=>setHintCount(n=>Math.min(2,n+1))}>Show the next workshop hint</button><button type="button" aria-expanded={showWorked} onClick={()=>setShowWorked(v=>!v)}>{showWorked?'Hide the worked workshop':'Compare with the worked workshop'}</button><button type="button" onClick={reset}>Reset this workshop</button></div>
  {exercise.hints.slice(0,hintCount).map((hint,i)=><p className="workshop-hint" key={i}>Hint {i+1}: {hint}</p>)}
  <label htmlFor={exercise.id+'-reasoning'}>{exercise.reasoningPrompt}</label>
  <textarea id={exercise.id+'-reasoning'} maxLength={3000} value={reasoning} onChange={e=>setReasoning(e.target.value)} placeholder="Your temporary explanation. Avoid confidential information."/>
  {showWorked&&<div className="workshop-worked"><h4>One worked explanation</h4><dl>{exercise.fields.map(f=><div key={f.id}><dt>{f.label}</dt><dd>{workedValue(f)}</dd></div>)}</dl><p>{exercise.workedReasoning}</p><p>Your explanation has not been graded. A different technically valid explanation can also be correct.</p><h4>Transfer challenge</h4><p>{exercise.transfer}</p></div>}
 </div>;
}
