import {useEffect,useState} from 'react';
import {useLearnerSession} from '../auth/LearnerSession';
import {supabase} from '../services/supabase';
import {createAdmissionRecoveryJournal} from '../professor/admissionRecoveryJournal';
import {createProfessorRecoveryController,professorRecoveryMessage} from '../../quality/candidates/professor-recovery-controller';

/** Read-only recovery of a public receipt already stored for this account/tab.
 * No start, provider, cancellation, retry or local-record deletion controls. */
export function PreviewSessionRecovery(){
 const {userId}=useLearnerSession();
 const [state,setState]=useState<{owner:string;message:string;busy:boolean;check:(()=>void)|null}|null>(null);
 useEffect(()=>{
  if(!userId){setState(null);return;}
  let alive=true;
  let controller:ReturnType<typeof createProfessorRecoveryController>|undefined;
  let busy=false;
  const update=(message:string,check:(()=>void)|null)=>{if(alive)setState({owner:userId,message,busy,check});};
  try{
   const receipt=createAdmissionRecoveryJournal(window.sessionStorage,userId).read();
   if(!receipt){setState(null);return;}
   const scope={receipt,epoch:0};
   controller=createProfessorRecoveryController(supabase,scope,()=>alive?scope:null);
   const check=()=>{if(!alive||busy)return;busy=true;update('Checking session status…',check);
    void controller!.refresh().then(result=>{busy=false;update(professorRecoveryMessage(result),check);})
     .catch(()=>{busy=false;update('Session status could not be confirmed. Do not start another attempt. You can check status again.',check);});
   };
   update('An earlier attempt needs verification. Check its status before starting another session.',check);
  }catch{update('The recovery record could not be read. Do not start another attempt.',null);}
  const {data}=supabase.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||session?.user.id!==userId){alive=false;controller?.dispose();setState(null);}});
  return ()=>{alive=false;controller?.dispose();data.subscription.unsubscribe();};
 },[userId]);
 if(!state||state.owner!==userId)return null;
 return <section className="priority-note" aria-label="Preview session recovery"><strong>Previous session attempt</strong><p role="status">{state.message}</p>{state.check&&<button disabled={state.busy} onClick={state.check}>Check session status</button>}</section>;
}
