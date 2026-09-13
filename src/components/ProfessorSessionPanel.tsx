import { useEffect, useRef, useState } from 'react';
import { useLearnerSession } from '../auth/LearnerSession';
import { canUseLearnerActions } from '../auth/identity';
import type { RemoteAudioTrack } from 'livekit-client';
import { isFeatureEnabled } from '../config/features';
import { getLearnerProfile, type LearnerKey } from '../learners/profiles';
import { connectProfessor, type ProfessorConnection } from '../professor/livekitProfessor';
import { professorVoiceLabel, type ProfessorVoiceState } from '../professor/voiceState';
import type { LearnerTrack, TutorSessionRequest } from '../services/contracts';
import '../professor/voice-validation.css';

type Props={lessonId?:string;track:'finance'|'payroll'|'english';learnerKey?:LearnerKey};
type SessionState='ready'|'connecting'|'connected'|'ended'|'error';
const lessons={finance:'b3639582-3c32-4147-a4b3-84237d11a66e',payroll:'6ffda415-3b18-46ab-afaa-414f81a7eb31'};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function resolvedLessonId(track:Props['track'],id?:string){return track==='english'?(id??'english-golden-lesson'):(id&&uuid.test(id)?id:lessons[track]);}
function contractFor(track:Props['track']):{learnerTrack:LearnerTrack;mode:TutorSessionRequest['mode']}{
 if(track==='payroll')return {learnerTrack:'viviane_payroll',mode:'chapter_conversation'};
 if(track==='english')return {learnerTrack:'english_academy',mode:'general_conversation'};
 return {learnerTrack:'rafael_finance',mode:'chapter_conversation'};
}
export function ProfessorSessionPanel({lessonId,track,learnerKey=track==='payroll'?'viviane':'rafael'}:Props){
 const account=useLearnerSession();
 const accountMatches=canUseLearnerActions(account.learnerKey,learnerKey,track);
 const enabled=isFeatureEnabled('professor');
 const requestedValidation=typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('validation')==='1';
 const learner=getLearnerProfile(learnerKey);
 const [state,setState]=useState<SessionState>('ready');
 const [voiceState,setVoiceState]=useState<ProfessorVoiceState>('awaiting_professor');
 const [validationConsent,setValidationConsent]=useState(false);
 const [details,setDetails]=useState<{sessionId:string;validationMode:boolean;maxSessionSeconds:number}|null>(null);
 const [error,setError]=useState<string|null>(null);
 const [audioBlocked,setAudioBlocked]=useState(false);
 const connectionRef=useRef<ProfessorConnection|null>(null);
 const connectionAbortRef=useRef<AbortController|null>(null);
 const audioHostRef=useRef<HTMLDivElement|null>(null);
 const elements=useRef<HTMLMediaElement[]>([]);
 const validationMode=details?.validationMode??requestedValidation;
 const active=state==='connected';
 useEffect(()=>()=>{
  connectionAbortRef.current?.abort();void connectionRef.current?.disconnect().catch(()=>undefined);
  elements.current.forEach(e=>e.remove());elements.current=[];
 },[]);
 function attachAudio(track:RemoteAudioTrack){
  const element=track.attach();element.autoplay=true;element.setAttribute('data-professor-audio','true');
  audioHostRef.current?.appendChild(element);elements.current.push(element);
  void element.play().catch(()=>setAudioBlocked(true));
 }
 async function start(){
  if(!enabled||!accountMatches||state==='connecting'||active||(requestedValidation&&!validationConsent))return;
  const controller=new AbortController();connectionAbortRef.current=controller;
  setState('connecting');setVoiceState('awaiting_professor');setDetails(null);setError(null);setAudioBlocked(false);
  try{
   const contract=contractFor(track);
   const connection=await connectProfessor({lessonId:resolvedLessonId(track,lessonId),learnerId:learnerKey,track:contract.learnerTrack,mode:contract.mode,validationMode:requestedValidation,languageProfile:{preferredMix:'uk-us-mix',includeIrishExposure:true,correctionMode:learner.english.preferredCorrectionMode,professorEnglishSharePct:learner.english.professorEnglishSharePct,supportLanguage:learner.professor.defaultLanguage}},{
    signal:controller.signal,expectedUserId:account.userId,
    onRemoteAudio:remote=>{if(!controller.signal.aborted)attachAudio(remote);},
    onAudioPlaybackStatusChanged:allowed=>{if(!controller.signal.aborted)setAudioBlocked(!allowed);},
    onProfessorState:next=>{if(!controller.signal.aborted)setVoiceState(next);},
    onDisconnected:()=>{if(!controller.signal.aborted)setState('ended');},
   });
   if(controller.signal.aborted){await connection.disconnect();return;}
   connectionRef.current=connection;
   setDetails({sessionId:connection.sessionId,validationMode:connection.validationMode,maxSessionSeconds:connection.maxSessionSeconds});
   setAudioBlocked(!connection.room.canPlaybackAudio);setState('connected');
  }catch(cause){if(controller.signal.aborted)return;setError(cause instanceof Error?cause.message:'Professor connection failed.');setState('error');}
 }
 async function stop(){
  connectionAbortRef.current?.abort();connectionAbortRef.current=null;
  const connection=connectionRef.current;connectionRef.current=null;
  if(connection)await connection.disconnect().catch(()=>undefined);
  elements.current.forEach(e=>e.remove());elements.current=[];setAudioBlocked(false);setState('ended');
 }
 async function enableAudio(){
  const room=connectionRef.current?.room;if(!room)return;
  try{await room.startAudio();setAudioBlocked(!room.canPlaybackAudio);if(room.canPlaybackAudio)setError(null);}
  catch{setAudioBlocked(true);setError('Your browser is blocking Professor audio. Tap Enable sound again or allow sound for this site.');}
 }
 const label=!enabled?'PROFESSOR LOCKED FOR SETUP':state==='connected'?professorVoiceLabel(voiceState):state==='connecting'?'CONNECTING':state==='ended'?'SESSION ENDED':state==='error'?'CONNECTION ERROR':'READY';
 return <div className="professor-session-panel" data-testid="professor-session-panel">
  <div className={`professor-live-orb ${active?voiceState:state}`} aria-hidden="true"><span>P</span></div>
  <div className="professor-live-copy">
   <span className="professor-state-label" role="status" aria-live="polite" data-testid="professor-voice-state">{validationMode?'VALIDATION MODE · ':''}{label}</span>
   <h3>{track==='english'?`${learner.displayName}'s conversation tutor`:track==='payroll'?'Irish Payroll Professor':'Finance Professor'}</h3>
   <p>{track==='english'?`British + American English with deliberate Irish exposure. Current English share target: ${learner.english.professorEnglishSharePct}%.`:track==='payroll'?'Patient payroll coaching with progressively more professional English.':'Executive finance coaching focused on judgement, business partnering and Dublin readiness.'}</p>
  </div>
  {requestedValidation&&!active&&state!=='connecting'&&<div className="professor-validation-card" data-testid="voice-validation-consent">
   <strong>Short validation · up to 5 minutes</strong>
   <p>This is a paid voice session, not a free simulation. Transcript, evaluation and cost records are retained. Your learning profile, Error Bank and spaced reviews are not updated.</p>
   <label><input type="checkbox" checked={validationConsent} onChange={e=>setValidationConsent(e.target.checked)}/> I understand the usage cost and validation recording scope.</label>
  </div>}
  {!accountMatches&&<p role="status" data-testid="professor-account-mismatch">This is a profile preview. Return to your signed-in learner or sign out to change accounts before starting the Professor.</p>}
  {state==='connecting'&&<button type="button" className="secondary-btn" onClick={()=>void stop()}>Cancel connection</button>}
  <div className="professor-live-actions">
   {!active?<button className="primary-btn" type="button" onClick={()=>void start()} disabled={!enabled||!accountMatches||state==='connecting'||(requestedValidation&&!validationConsent)}>{!enabled?'LiveKit setup required':state==='connecting'?'Connecting…':requestedValidation?'Start validation session':'Start voice session'}</button>:<>
    {audioBlocked&&<button className="primary-btn professor-enable-audio" type="button" onClick={()=>void enableAudio()}>🔊 Enable sound</button>}
    <button className="primary-btn professor-stop" type="button" onClick={()=>void stop()}>End session</button>
   </>}
  </div>
  {audioBlocked&&active&&<div className="professor-audio-warning" role="status">Your browser blocked voice playback. Tap <strong>Enable sound</strong> once.</div>}
  {active&&voiceState==='awaiting_professor'&&<p className="professor-privacy-note">The room is connected. Waiting for the Professor to report its state; this does not yet confirm that voice is ready.</p>}
  {details&&<p className="professor-session-reference" data-testid="professor-session-reference">Session {details.sessionId.slice(0,8)} · {details.validationMode?'Validation':'Learning'} · maximum {Math.round(details.maxSessionSeconds/60)} min</p>}
  {error&&<div className="professor-live-error" role="alert">{error}</div>}
  {state==='ended'&&details&&<p className="professor-privacy-note">Connection ended. Evaluation and cost settlement may still be processing; this screen does not confirm they were saved.</p>}
  <div ref={audioHostRef} className="professor-audio-host" aria-hidden="true"/>
  <div className="professor-privacy-note">AI voice tutor · Raw learner voice is not stored by the Learning Hub by default.</div>
 </div>;
}
