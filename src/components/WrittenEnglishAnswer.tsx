import {useRef,useState} from 'react';
import {assessEnglishActivity,type EnglishActivityResult} from '../services/englishActivityAssessment';
import {EnglishActivityFeedback} from './EnglishActivityFeedback';

export function WrittenEnglishAnswer({lessonId,itemId,prompt,index,result,onResult,disabled=false}:{lessonId:string;itemId:string;prompt:string;index:number;result?:EnglishActivityResult;onResult:(result:EnglishActivityResult)=>void;disabled?:boolean}){
 const [draft,setDraft]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [submitted,setSubmitted]=useState('');
 const pending=useRef<{id:string;text:string}|null>(null),running=useRef(false);
 async function submit(){
  if(running.current||disabled||draft.trim().length<3)return;
  running.current=true;setBusy(true);setError('');
  if(!pending.current)pending.current={id:crypto.randomUUID(),text:draft};
  try{const next=await assessEnglishActivity(lessonId,'practice',itemId,pending.current.id,pending.current.text);setSubmitted(pending.current.text);pending.current=null;onResult(next);}
  catch(cause){setError(cause instanceof Error?cause.message:'Evaluation could not finish.');}
  finally{running.current=false;setBusy(false);}
 }
 return <article className="deep-activity-card" data-testid={`english-written-${index}`}>
  <div className="deep-activity-meta"><span>Written response</span>{result?<span>Evaluated</span>:null}</div><h4>{index+1}. {prompt}</h4>
  <label className="deep-written-response"><span>Your answer</span><textarea value={draft} onChange={event=>setDraft(event.target.value)} disabled={busy||Boolean(pending.current)||disabled} maxLength={6000} placeholder="Write your answer in English…"/></label>
  <button type="button" disabled={disabled||busy||draft.trim().length<3||Boolean(result&&draft===submitted)} onClick={()=>void submit()}>{busy?'Analysing your answer…':pending.current?'Retry this submission':result?'Send revised answer':'Send answer for analysis'}</button>
  {error?<p role="alert">{error}</p>:null}{result?<EnglishActivityFeedback result={result}/>:null}
 </article>;
}
