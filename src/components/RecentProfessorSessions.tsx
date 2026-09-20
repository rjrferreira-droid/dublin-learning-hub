import {useCallback,useEffect,useRef,useState} from 'react';
import {supabase} from '../services/supabase';
import {readRecentProfessorSessions,type RecentProfessorSession} from '../professor/recentSessions';
import {SessionOutcomePanel} from './SessionOutcomePanel';

export function RecentProfessorSessions({userId,lessonId,autoCheck=false}:{userId:string;lessonId:string;autoCheck?:boolean}){
 const [rows,setRows]=useState<RecentProfessorSession[]|null>(null);
 const [checking,setChecking]=useState(false);const [failed,setFailed]=useState(false);
 const [selected,setSelected]=useState<RecentProfessorSession|null>(null);
 const active=useRef<AbortController|null>(null);const automatic=useRef(false);
 const check=useCallback(async()=>{
  active.current?.abort();const controller=new AbortController();active.current=controller;
  setChecking(true);setFailed(false);setRows(null);setSelected(null);
  try{
   const result=await readRecentProfessorSessions(supabase,{userId,lessonId},controller.signal);
   if(!controller.signal.aborted)setRows(result);
  }catch{if(!controller.signal.aborted)setFailed(true);}
  finally{if(!controller.signal.aborted)setChecking(false);}
 },[userId,lessonId]);
 useEffect(()=>()=>{
  active.current?.abort();
  // StrictMode replays mount effects. Its cancelled automatic read must be
  // eligible for the next setup, or the checking state would never complete.
  automatic.current=false;
 },[]);
 useEffect(()=>{if(autoCheck&&!automatic.current){automatic.current=true;void check();}},[autoCheck,check]);
 return <section className="recent-professor-sessions" aria-label="Recent Professor sessions" data-testid="recent-professor-sessions">
  <h4>Previous conversations</h4>
  <p>Closed the page or lost the connection? Find up to five recent sessions saved for this lesson. Opening a result does not restart the conversation.</p>
  <button type="button" disabled={checking} onClick={()=>void check()}>{checking?'Checking previous sessions…':rows!==null||failed?'Check previous sessions again':'Find previous sessions'}</button>
  <p role="status" aria-live="polite">{failed?'Previous sessions could not be checked. Your history has not been reset. You can check again without starting a conversation.':rows?.length===0?(autoCheck?'No saved session was returned. This does not confirm that the latest start was cancelled. Check again before repeating it.':'No saved sessions were returned for this lesson.') :rows?`${rows.length} saved ${rows.length===1?'session':'sessions'} found.`:''}</p>
  {rows&&rows.length>0&&<ul className="recent-session-list">{rows.map(row=><li key={row.id}>
   <div><time dateTime={row.startedAt}>{new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(row.startedAt))}</time>
    <span>{row.status==='active'?'Completion pending':row.status==='completed'?'Completed':row.validation?'Validation record':'Not completed'} · {row.validation?'Validation':'Learning'} · {row.id.slice(0,8)}</span></div>
   <button type="button" aria-pressed={selected?.id===row.id} aria-label={`View saved result for session ${row.id.slice(0,8)}`} onClick={()=>setSelected(row)}>View saved result</button>
  </li>)}</ul>}
  {selected&&<SessionOutcomePanel key={selected.id} sessionId={selected.id} validation={selected.validation}/>}
 </section>;
}
