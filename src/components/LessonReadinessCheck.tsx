import {useEffect,useRef,useState} from 'react';
import type {BoundIdentity} from '../../quality/candidates/professor-admission-contract.ts';
import {supabase} from '../services/supabase';
import {checkLessonReadiness} from '../professor/checkLessonReadiness';
import {PreviewAudioReadinessPanel} from './PreviewAudioReadinessPanel';
import {PreviewAdmissionPanel} from './PreviewAdmissionPanel';

type Props={userId:string;lessonId:string;lessonSlug:string;track:'finance'|'payroll'|'english';activeTab:string};
export function LessonReadinessCheck(props:Props){
 const [state,setState]=useState<'idle'|'checking'|'verified'|'unavailable'>('idle');
 const [identity,setIdentity]=useState<BoundIdentity|null>(null);
 const pending=useRef<AbortController|null>(null);
 useEffect(()=>{
  const reset=()=>{pending.current?.abort();pending.current=null;setIdentity(null);setState('idle');};
  const {data}=supabase.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||session?.user.id!==props.userId)reset();});
  return ()=>{pending.current?.abort();pending.current=null;data.subscription.unsubscribe();};
 },[props.userId,props.lessonId,props.lessonSlug,props.track]);
 async function check(){
  pending.current?.abort();const controller=new AbortController();pending.current=controller;setIdentity(null);setState('checking');
  const requestedTrack=props.track==='finance'?'rafael_finance':props.track==='payroll'?'viviane_payroll':'english_academy';
  const verified=await checkLessonReadiness(supabase.auth,{...props,requestedTrack},controller.signal);
  if(!controller.signal.aborted&&pending.current===controller){setIdentity(verified);setState(verified?'verified':'unavailable');pending.current=null;}
 }
 const diagnostic=new URLSearchParams(window.location.search).get('previewCheck')==='1';
 const admissionVisible=state==='verified'&&identity&&props.activeTab==='Professor'&&diagnostic;
 const audioVisible=state==='verified'&&identity&&props.activeTab==='Audio'&&diagnostic;
 return <div className="priority-note" data-testid="lesson-readiness-check">
  <button type="button" className="secondary-btn" disabled={state==='checking'} onClick={()=>void check()}>{state==='checking'?'Checking lesson…':'Check lesson availability'}</button>
  <p role="status">{state==='verified'?'Lesson reference verified. Professor and audio are still unavailable.':state==='unavailable'?'Availability could not be confirmed. You can continue the written lesson.':'This check does not start a session or generate audio.'}</p>
  {admissionVisible?<PreviewAdmissionPanel key={[identity.lessonId,identity.moduleId,identity.courseId,identity.contentVersion,identity.lessonSlug,identity.requestedTrack,identity.studyTrack,identity.sequence].join(':')} userId={props.userId} identity={identity}/>:null}
  {audioVisible?<PreviewAudioReadinessPanel key={[identity.lessonId,identity.moduleId,identity.courseId,identity.contentVersion,identity.lessonSlug,identity.requestedTrack,identity.studyTrack,identity.sequence].join(':')} userId={props.userId} identity={identity}/>:null}
 </div>;
}
