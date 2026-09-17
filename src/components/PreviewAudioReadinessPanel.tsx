import {useEffect,useRef,useState} from 'react';
import type {BoundIdentity} from '../../quality/candidates/professor-admission-contract.ts';
import {checkPremiumAudioReadiness} from '../audio/checkPremiumAudioReadiness';
import {supabase} from '../services/supabase';

type Props={userId:string;identity:BoundIdentity};
type State='idle'|'checking'|'verified'|'unavailable';

/** Read-only P1 Audio source binding. It deliberately cannot load cache media,
 * reserve budget or reach the Premium Audio Edge/provider path. */
export function PreviewAudioReadinessPanel({userId,identity}:Props){
 const [state,setState]=useState<State>('idle');
 const pending=useRef<AbortController|null>(null);
 useEffect(()=>{
  const reset=()=>{pending.current?.abort();pending.current=null;setState('idle');};
  const {data}=supabase.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||session?.user.id!==userId)reset();});
  return ()=>{pending.current?.abort();pending.current=null;data.subscription.unsubscribe();};
 },[userId,identity.lessonId,identity.moduleId,identity.courseId,identity.lessonSlug,identity.contentVersion,identity.requestedTrack,identity.studyTrack,identity.sequence]);
 async function verify(){
  if(state!=='idle'||pending.current)return;
  const controller=new AbortController();pending.current=controller;setState('checking');
  const result=await checkPremiumAudioReadiness(supabase.auth,{userId,identity},controller.signal);
  if(!controller.signal.aborted&&pending.current===controller){pending.current=null;setState(result?'verified':'unavailable');}
 }
 const message=state==='verified'
  ?'Candidate Audio source and expected versioned cache path verified. Cache lookup, runtime source handoff, atomic budget admission and provider generation remain closed.'
  :state==='unavailable'
   ?'The Audio reference could not be verified. No generation was attempted; reload this diagnostic before trying again.'
   :state==='checking'?'Checking the server-authored Audio reference…':'This checks the server-authored candidate source and expected versioned path only. It cannot inspect cache, hand a script to the Audio runtime, reserve budget, load media or generate audio.';
 return <div className="priority-note" data-testid="p1-audio-readiness-panel">
  <strong>Premium Audio binding check</strong>
  <button type="button" className="secondary-btn" disabled={state!=='idle'} onClick={()=>void verify()}>{state==='checking'?'Checking Audio binding…':'Validate Audio binding'}</button>
  <p role="status">{message}</p>
 </div>;
}
