import {selectedWorkshop,type WorkshopSelection} from '../learning/workshopSelection';
import {WorkshopSessionReference} from './WorkshopSessionReference';
import {useEffect,useRef,useState} from 'react';
import {useLearnerSession} from '../auth/LearnerSession';
import {canUseLearnerActions} from '../auth/identity';
import type {RemoteAudioTrack} from 'livekit-client';
import {isFeatureEnabled} from '../config/features';
import {getLearnerProfile,type LearnerKey} from '../learners/profiles';
import {connectProfessor,type ProfessorConnection} from '../professor/livekitProfessor';
import {professorVoiceLabel,type ProfessorVoiceState} from '../professor/voiceState';
import type {LearnerTrack,TutorSessionRequest} from '../services/contracts';
import {ProfessorLearningGuide} from './ProfessorLearningGuide';
import {SessionPreparationPanel} from './SessionPreparationPanel';
import {SessionOutcomePanel} from './SessionOutcomePanel';
import {DEFAULT_PREPARATION,type SessionPreparation} from '../learning/sessionPreparation';
import '../professor/voice-validation.css';

type Props={lessonId?:string;track:'finance'|'payroll'|'english';learnerKey?:LearnerKey;compact?:boolean;onActivityChange?:(busy:boolean)=>void;workshopId?:string;onClearWorkshop?:()=>void};
type SessionState='ready'|'connecting'|'connected'|'ending'|'ended'|'error';
const lessons={finance:'b3639582-3c32-4147-a4b3-84237d11a66e',payroll:'6ffda415-3b18-46ab-afaa-414f81a7eb31'};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function resolvedLessonId(track:Props['track'],id?:string){return track==='english'?(id??'english-golden-lesson'):(id&&uuid.test(id)?id:lessons[track]);}
function contractFor(track:Props['track']):{learnerTrack:LearnerTrack;mode:TutorSessionRequest['mode']}{
 if(track==='payroll')return {learnerTrack:'viviane_payroll',mode:'chapter_conversation'};
 if(track==='english')return {learnerTrack:'english_academy',mode:'general_conversation'};
 return {learnerTrack:'rafael_finance',mode:'chapter_conversation'};
}
export function ProfessorSessionPanel({lessonId,track,learnerKey=track==='payroll'?'viviane':'rafael',compact=false,onActivityChange,workshopId,onClearWorkshop}:Props){
 const account=useLearnerSession();const accountMatches=canUseLearnerActions(account.learnerKey,learnerKey,track);
 const enabled=isFeatureEnabled('professor');
 const requestedValidation=typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('validation')==='1';
 const learner=getLearnerProfile(learnerKey);
 const [state,setState]=useState<SessionState>('ready');
 const pickedWorkshop=selectedWorkshop(track,workshopId?{version:1,id:workshopId}:null);
 const [sessionWorkshop,setSessionWorkshop]=useState<WorkshopSelection|null>(null);
 const [sessionPreparation,setSessionPreparation]=useState<SessionPreparation>({...DEFAULT_PREPARATION});
 const [microphoneEnabled,setMicrophoneEnabled]=useState(true);const [microphoneBusy,setMicrophoneBusy]=useState(false);
 const [voiceState,setVoiceState]=useState<ProfessorVoiceState>('awaiting_professor');
 const [validationConsent,setValidationConsent]=useState(false);
 const [details,setDetails]=useState<{sessionId:string;validationMode:boolean;maxSessionSeconds:number}|null>(null);
 const [error,setError]=useState<string|null>(null);const [audioBlocked,setAudioBlocked]=useState(false);
 const mounted=useRef(false);const startLock=useRef(false);const microphoneLock=useRef(false);
 const stopPromise=useRef<Promise<void>|null>(null);
 const connectionRef=useRef<ProfessorConnection|null>(null);const connectionAbortRef=useRef<AbortController|null>(null);
 const audioHostRef=useRef<HTMLDivElement|null>(null);
 const attachments=useRef<Array<{track:RemoteAudioTrack;element:HTMLMediaElement}>>([]);
 const validationMode=details?.validationMode??requestedValidation;const active=state==='connected';
 const busy=active||state==='connecting'||state==='ending';
 function clearAudio(){
  for(const {track:remote,element} of attachments.current){try{element.pause();remote.detach(element);}catch{/* Already detached by the SDK. */}element.remove();}
  attachments.current=[];
 }
 useEffect(()=>{mounted.current=true;return ()=>{
  mounted.current=false;connectionAbortRef.current?.abort();
  const connection=connectionRef.current;connectionRef.current=null;
  void connection?.disconnect().catch(()=>undefined);clearAudio();
 };},[]);
 useEffect(()=>{onActivityChange?.(busy);},[busy,onActivityChange]);
 function current(controller:AbortController){return mounted.current&&!controller.signal.aborted&&connectionAbortRef.current===controller;}
 function attachAudio(remote:RemoteAudioTrack,controller:AbortController){
  if(!current(controller))return;const element=remote.attach();element.autoplay=true;element.setAttribute('data-professor-audio','true');
  audioHostRef.current?.appendChild(element);attachments.current.push({track:remote,element});
  void element.play().catch(()=>{if(current(controller))setAudioBlocked(true);});
 }
 async function start(){
  if(!mounted.current||!enabled||!accountMatches||busy||startLock.current||stopPromise.current||(requestedValidation&&!validationConsent))return;
  // A synchronous lock prevents duplicate requests before React has rendered the disabled button.
  startLock.current=true;const controller=new AbortController();connectionAbortRef.current=controller;
  const workshopChoice:WorkshopSelection|undefined=pickedWorkshop?{version:1,id:pickedWorkshop.id}:undefined;
  setSessionWorkshop(workshopChoice??null);
  clearAudio();setState('connecting');setVoiceState('awaiting_professor');setDetails(null);setError(null);setAudioBlocked(false);
  try{
   const contract=contractFor(track);
   const connection=await connectProfessor({lessonId:resolvedLessonId(track,lessonId),learnerId:learnerKey,track:contract.learnerTrack,mode:contract.mode,validationMode:requestedValidation,sessionPreparation,workshopSelection:workshopChoice,languageProfile:{preferredMix:'uk-us-mix',includeIrishExposure:true,correctionMode:learner.english.preferredCorrectionMode,professorEnglishSharePct:learner.english.professorEnglishSharePct,supportLanguage:learner.professor.defaultLanguage}},{
    signal:controller.signal,expectedUserId:account.userId,
    onRemoteAudio:remote=>attachAudio(remote,controller),
    onAudioPlaybackStatusChanged:allowed=>{if(current(controller))setAudioBlocked(!allowed);},
    onProfessorState:next=>{if(current(controller))setVoiceState(next);},
    onDisconnected:()=>{
     if(!current(controller))return;
     const previous=connectionRef.current;connectionRef.current=null;
     controller.abort();clearAudio();startLock.current=false;microphoneLock.current=false;
     void previous?.disconnect().catch(()=>undefined);
     setAudioBlocked(false);setMicrophoneBusy(false);setState('ended');
    },
   });
   if(!current(controller)){await connection.disconnect().catch(()=>undefined);return;}
   connectionRef.current=connection;
   setDetails({sessionId:connection.sessionId,validationMode:connection.validationMode,maxSessionSeconds:connection.maxSessionSeconds});
   setAudioBlocked(!connection.room.canPlaybackAudio);setMicrophoneEnabled(true);setMicrophoneBusy(false);microphoneLock.current=false;setState('connected');
  }catch(cause){if(current(controller)){setError(cause instanceof Error?cause.message:'Professor connection failed.');setState('error');}}
  finally{if(connectionAbortRef.current===controller)startLock.current=false;}
 }
 function stop():Promise<void>{
  if(stopPromise.current)return stopPromise.current;
  const controller=connectionAbortRef.current;const connection=connectionRef.current;
  connectionRef.current=null;controller?.abort();clearAudio();
  if(mounted.current){setState('ending');setAudioBlocked(false);}
  const pending=(async()=>{
   try{if(connection)await connection.disconnect();}catch{/* Connection closed or transport unavailable; no settlement is inferred. */}
   finally{
    if(connectionAbortRef.current===controller){connectionAbortRef.current=null;startLock.current=false;microphoneLock.current=false;}
    if(mounted.current){setMicrophoneBusy(false);setState('ended');}
   }
  })();
  stopPromise.current=pending;void pending.finally(()=>{if(stopPromise.current===pending)stopPromise.current=null;});return pending;
 }
 async function toggleMicrophone(){
  const connection=connectionRef.current,controller=connectionAbortRef.current;
  if(!connection||!controller||!current(controller)||microphoneLock.current)return;
  microphoneLock.current=true;setMicrophoneBusy(true);const next=!microphoneEnabled;
  try{await connection.setMicrophoneEnabled(next);if(current(controller)&&connectionRef.current===connection)setMicrophoneEnabled(next);}
  catch{if(current(controller))setError('The microphone setting could not be changed.');}
  finally{if(current(controller)){microphoneLock.current=false;setMicrophoneBusy(false);}}
 }
 async function enableAudio(){
  const connection=connectionRef.current,controller=connectionAbortRef.current;if(!connection||!controller||!current(controller))return;
  try{await connection.room.startAudio();if(current(controller)){setAudioBlocked(!connection.room.canPlaybackAudio);if(connection.room.canPlaybackAudio)setError(null);}}
  catch{if(current(controller)){setAudioBlocked(true);setError('Your browser is blocking Professor audio. Tap Enable sound again or allow sound for this site.');}}
 }
 const label=!enabled?'PROFESSOR LOCKED FOR SETUP':active?professorVoiceLabel(voiceState):state==='connecting'?'CONNECTING':state==='ending'?'ENDING CONNECTION':state==='ended'?'SESSION ENDED':state==='error'?'CONNECTION ERROR':'READY';
 return <div className={'professor-session-panel'+(compact?' professor-compact':'')} data-testid="professor-session-panel">
  <div className={`professor-live-orb ${active?voiceState:state}`} aria-hidden="true"><span>P</span></div>
  <div className="professor-live-copy">
   <span className="professor-state-label" role="status" aria-live="polite" data-testid="professor-voice-state">{validationMode?'VALIDATION MODE · ':''}{label}</span>
   <h3>{track==='english'?`${learner.displayName}'s conversation tutor`:track==='payroll'?'Irish Payroll Professor':'Finance Professor'}</h3>
   <p>{track==='english'?`British + American English with deliberate Irish exposure. Current English share target: ${learner.english.professorEnglishSharePct}%.`:track==='payroll'?'Patient payroll coaching with progressively more professional English.':'Executive finance coaching focused on judgement, business partnering and Dublin readiness.'}</p>
  </div>
  <WorkshopSessionReference track={track} selection={busy?sessionWorkshop:pickedWorkshop?{version:1,id:pickedWorkshop.id}:null} busy={busy} onClear={onClearWorkshop}/>
  {accountMatches&&!busy&&!compact&&<SessionPreparationPanel value={sessionPreparation} onChange={setSessionPreparation}/>}
  {requestedValidation&&!busy&&!compact&&<div className="professor-validation-card" data-testid="voice-validation-consent">
   <strong>Short validation · up to 5 minutes</strong>
   <p>This is a paid voice session, not a free simulation. Transcript, evaluation and cost records are retained. Your learning profile, Error Bank and spaced reviews are not updated.</p>
   <label><input type="checkbox" checked={validationConsent} onChange={e=>setValidationConsent(e.target.checked)}/> I understand the usage cost and validation recording scope.</label>
  </div>}
  {!accountMatches&&<p role="status" data-testid="professor-account-mismatch">This is a profile preview. Return to your signed-in learner or sign out to change accounts before starting the Professor.</p>}
  {state==='connecting'&&<button type="button" className="secondary-btn" onClick={()=>void stop()}>Cancel connection</button>}
  <div className="professor-live-actions">
   {active?<>
    {audioBlocked&&<button className="primary-btn professor-enable-audio" type="button" onClick={()=>void enableAudio()}>🔊 Enable sound</button>}
    <button className="secondary-btn professor-mute" type="button" disabled={microphoneBusy} aria-pressed={!microphoneEnabled} onClick={()=>void toggleMicrophone()}>{microphoneEnabled?'Mute microphone':'Unmute microphone'}</button>
    <button className="primary-btn professor-stop" type="button" onClick={()=>void stop()}>End session</button>
   </>:!compact&&<button className="primary-btn" type="button" onClick={()=>void start()} disabled={!enabled||!accountMatches||busy||(requestedValidation&&!validationConsent)}>{!enabled?'LiveKit setup required':state==='connecting'?'Connecting…':state==='ending'?'Ending…':requestedValidation?'Start validation session':'Start voice session'}</button>}
  </div>
  {active&&!microphoneEnabled&&<p className="professor-mic-state" role="status">Microphone muted. The session timer and usage charges continue; use End session to leave.</p>}
  {audioBlocked&&active&&<div className="professor-audio-warning" role="status">Your browser blocked voice playback. Tap <strong>Enable sound</strong> once.</div>}
  {active&&voiceState==='awaiting_professor'&&<p className="professor-privacy-note">The room is connected. Waiting for the Professor to report its state; this does not yet confirm that voice is ready.</p>}
  {details&&<p className="professor-session-reference" data-testid="professor-session-reference">Session {details.sessionId.slice(0,8)} · {details.validationMode?'Validation':'Learning'} · maximum {Math.round(details.maxSessionSeconds/60)} min</p>}
  {error&&<div className="professor-live-error" role="alert">{error}</div>}
  {state==='ended'&&details&&!compact&&<p className="professor-privacy-note">Connection ended. Evaluation and cost settlement may still be processing; this screen does not confirm they were saved.</p>}
  {/* Keep the same bounded outcome reader mounted across tab changes after ending. */}
  {state==='ended'&&details&&<div hidden={compact} className="professor-outcome-holder"><SessionOutcomePanel key={details.sessionId} sessionId={details.sessionId} validation={details.validationMode}/></div>}
  <div ref={audioHostRef} className="professor-audio-host" aria-hidden="true"/>
  <div className="professor-privacy-note">AI voice tutor · Raw learner voice is not stored by the Learning Hub by default.</div>
  {accountMatches&&!busy&&!compact&&<ProfessorLearningGuide track={track} lessonId={lessonId} phase={state==='ended'?'ended':'ready'}/>}
 </div>;
}
