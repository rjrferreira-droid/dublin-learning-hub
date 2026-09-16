import {useEffect,useRef,useState} from 'react';
import {supabase} from '../services/supabase';
import {checkLessonReadiness} from '../professor/checkLessonReadiness';

type Props={userId:string;lessonId:string;lessonSlug:string;track:'finance'|'payroll'|'english'};
export function LessonReadinessCheck(props:Props){
 const [state,setState]=useState<'idle'|'checking'|'verified'|'unavailable'>('idle');
 const pending=useRef<AbortController|null>(null);
 useEffect(()=>{
  const {data}=supabase.auth.onAuthStateChange(()=>{pending.current?.abort();pending.current=null;setState('idle');});
  return ()=>{pending.current?.abort();pending.current=null;data.subscription.unsubscribe();};
 },[props.userId,props.lessonId,props.lessonSlug,props.track]);
 async function check(){
  pending.current?.abort();const controller=new AbortController();pending.current=controller;setState('checking');
  const requestedTrack=props.track==='finance'?'rafael_finance':props.track==='payroll'?'viviane_payroll':'english_academy';
  const ok=await checkLessonReadiness(supabase.auth,{...props,requestedTrack},controller.signal);
  if(!controller.signal.aborted&&pending.current===controller){setState(ok?'verified':'unavailable');pending.current=null;}
 }
 return <div className="priority-note" data-testid="lesson-readiness-check">
  <button type="button" className="secondary-btn" disabled={state==='checking'} onClick={()=>void check()}>{state==='checking'?'Checking lesson…':'Check lesson availability'}</button>
  <p role="status">{state==='verified'?'Lesson reference verified. Professor and audio are still unavailable.':state==='unavailable'?'Availability could not be confirmed. You can continue the written lesson.':'This check does not start a session or generate audio.'}</p>
 </div>;
}
