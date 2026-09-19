import {useEffect,useRef,useState} from 'react';
import {useLearnerSession} from '../auth/LearnerSession';
import {supabase} from '../services/supabase';
import {discoverRecovery} from '../professor/discoverRecovery';

export function PreviewRecoveryDiscovery(){
 const {userId}=useLearnerSession();const active=useRef<AbortController|null>(null);
 const [state,setState]=useState({owner:userId,message:'',busy:false});
 useEffect(()=>{
  const {data}=supabase.auth.onAuthStateChange((event,session)=>{
   if(event==='SIGNED_OUT'||session?.user.id!==userId){active.current?.abort();active.current=null;setState({owner:userId,message:'',busy:false});}
  });
  return ()=>{active.current?.abort();active.current=null;data.subscription.unsubscribe();};
 },[userId]);
 async function check(){
  if(!userId||active.current)return;
  const controller=new AbortController();active.current=controller;setState({owner:userId,message:'Checking previous attempts…',busy:true});
  try{
   const result=await discoverRecovery(supabase,userId,controller.signal);
   if(active.current!==controller||controller.signal.aborted)return;
   const message=result.attempts.length?`${result.attempts.length}${result.truncated?' or more':''} previous attempt(s) still need verification. Do not start another session.`:'No pending attempt was found in this check. This does not authorize a new session.';
   setState({owner:userId,message,busy:false});
  }catch{if(active.current===controller&&!controller.signal.aborted)setState({owner:userId,message:'Previous attempts could not be verified. Do not start another session.',busy:false});}
  finally{if(active.current===controller)active.current=null;}
 }
 return <section className="priority-note" aria-label="Find previous attempts"><strong>Recover after closing a tab</strong><p>Check your account for pending attempts without starting a session.</p><button disabled={!userId||(state.owner===userId&&state.busy)} onClick={()=>void check()}>Find previous attempts</button><p role="status">{state.owner===userId?state.message:''}</p></section>;
}
