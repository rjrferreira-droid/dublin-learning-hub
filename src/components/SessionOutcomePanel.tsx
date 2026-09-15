import {useEffect,useState} from 'react';
import {FeedbackEvidencePanel} from './FeedbackEvidencePanel';
import {useLearnerSession} from '../auth/LearnerSession';
import {emptySessionOutcome,pollSessionOutcome,type SessionOutcome} from '../professor/sessionOutcome';
import {loadSessionOutcome} from '../services/sessionOutcome';
import '../professor/session-experience.css';
export function SessionOutcomePanel({sessionId,validation}:{sessionId:string;validation:boolean}){
 const account=useLearnerSession();
 const [attempt,setAttempt]=useState(0);const [checking,setChecking]=useState(true);
 const [outcome,setOutcome]=useState<SessionOutcome>(()=>emptySessionOutcome({sessionId,userId:account.userId,validation}));
 useEffect(()=>{
  const controller=new AbortController();const id={sessionId,userId:account.userId,validation};
  setChecking(true);setOutcome(emptySessionOutcome(id));
  void pollSessionOutcome(()=>loadSessionOutcome(id,controller.signal),setOutcome,{signal:controller.signal})
   .catch(()=>{if(!controller.signal.aborted)setOutcome(emptySessionOutcome(id,'unavailable'));})
   .finally(()=>{if(!controller.signal.aborted)setChecking(false);});
  return ()=>controller.abort();
 },[sessionId,account.userId,validation,attempt]);
 const title=outcome.kind==='ready'?'Your session feedback':outcome.kind==='saved_without_feedback'?'Session saved · feedback not available':outcome.kind==='stopped'?'Session marked as not completed':outcome.kind==='unavailable'?'Session status could not be checked':checking?'Checking saved feedback…':'Feedback is still pending';
 return <section className="session-outcome" data-testid="session-outcome" aria-label="Saved session feedback">
  <h3 aria-live="polite">{title}</h3>
  {outcome.kind==='ready'?<>
   {outcome.summary&&<p>{outcome.summary}</p>}
   {outcome.strengths.length>0&&<div><h4>What went well</h4><ul>{outcome.strengths.map((s,i)=><li key={i}>{s}</li>)}</ul></div>}
   {outcome.nextFocus.length>0&&<div><h4>One useful next step</h4><p>{outcome.nextFocus[0]}</p></div>}
  </>:<p>{outcome.kind==='saved_without_feedback'?'A completed record exists, but it does not contain usable feedback. No score or learning gain is inferred here.':outcome.kind==='stopped'?'This record is not marked completed. Do not repeat the conversation solely to force an evaluation or release a reservation.':outcome.kind==='unavailable'?'Your history has not been reset. This check could not establish the current result.':'The voice connection has ended. The server may still be processing the transcript and feedback; this page does not manufacture a result while waiting.'}</p>}
  {outcome.kind==='ready'&&<FeedbackEvidencePanel details={outcome.details}/>}
  <p className="outcome-scope">{validation?'Validation session: this feedback does not confirm any update to mastery, Error Bank or reviews.':'This is the feedback recorded for this session, not a guarantee of mastery.'} Cost settlement is separate and is not verified by this panel.</p>
  <small>Session {sessionId.slice(0,8)} · up to six read-only checks · no new AI call</small>
  {!checking&&outcome.kind!=='ready'&&<button type="button" onClick={()=>setAttempt(x=>x+1)}>Check saved status again</button>}
 </section>;
}
