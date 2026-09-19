import {useEffect,useRef,useState} from 'react';
import type {BoundIdentity,ReferenceReceipt} from '../../quality/candidates/professor-admission-contract.ts';
import {createAdmissionRecoveryJournal} from '../professor/admissionRecoveryJournal';
import {createPreviewAdmission} from '../professor/previewAdmission';
import {supabase} from '../services/supabase';

type Props={userId:string;identity:BoundIdentity};
type Status='ready'|'starting'|'denied'|'admitted'|'unavailable'|'unconfirmed'|'recovery';

/** Explicit validation-only start. It can reserve only through the reviewed
 * admission route and deliberately has no LiveKit, Audio or provider handoff. */
export function PreviewAdmissionPanel({userId,identity}:Props){
 const [status,setStatus]=useState<Status>('ready');
 const active=useRef<ReturnType<typeof createPreviewAdmission>|null>(null);
 const revision=useRef(0);
 const busy=status==='starting';
 useEffect(()=>{
  const reset=()=>{revision.current++;active.current?.dispose();active.current=null;setStatus('ready');};
  const {data}=supabase.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||session?.user.id!==userId)reset();});
  return ()=>{revision.current++;active.current?.dispose();active.current=null;data.subscription.unsubscribe();};
 },[userId,identity.lessonId,identity.moduleId,identity.courseId,identity.contentVersion,identity.lessonSlug,identity.requestedTrack,identity.studyTrack,identity.sequence]);
 async function start(){
  if(busy||active.current)return;
  let journal:ReturnType<typeof createAdmissionRecoveryJournal>;
  try{
   journal=createAdmissionRecoveryJournal(window.sessionStorage,userId);
   if(journal.read()){setStatus('recovery');return;}
  }catch{setStatus('recovery');return;}
  const version=++revision.current;
  let checkpoint:ReferenceReceipt|null=null;
  const controller=createPreviewAdmission(supabase.auth,{userId,requestId:crypto.randomUUID(),mode:identity.studyTrack==='english'?'general_conversation':'chapter_conversation',identity},fetch,15000,receipt=>{journal.save(receipt);checkpoint=structuredClone(receipt);});
  active.current=controller;setStatus('starting');
  const result=await controller.start();
  if(revision.current!==version||active.current!==controller)return;
  active.current=null;
  if(result.status!=='admitted'&&!result.reservationMayExist&&checkpoint){
   try{journal.clear(checkpoint);}catch{setStatus('recovery');return;}
  }
  if(result.status==='admitted')setStatus('admitted');
  else if(result.status==='denied')setStatus(result.reservationMayExist?'recovery':'denied');
  else setStatus(result.status);
 }
 const message={
  ready:'This validation checks the protected start only. It cannot connect voice or call a provider.',
  starting:'Checking the protected start…',
  denied:'The disposable budget denied the start. No session or provider was started.',
  admitted:'The protected reservation was acknowledged. Provider connection remains disabled.',
  unavailable:'The protected start was unavailable. This control will not retry automatically.',
  unconfirmed:'The start outcome is unconfirmed. Do not retry; reload this diagnostic page to check the saved attempt.',
  recovery:'An earlier attempt needs recovery. Reload this diagnostic page to check it; no new start was sent.',
 }[status];
 return <div className="priority-note" data-testid="preview-admission-panel">
  <strong>Protected start validation</strong>
  <button type="button" className="secondary-btn" disabled={status!=='ready'} onClick={()=>void start()}>{busy?'Checking protected start…':'Test protected start'}</button>
  <p role="status">{message}</p>
 </div>;
}
