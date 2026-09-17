import {useEffect,useRef,useState} from 'react';
import {supabase} from '../services/supabase';
import {useLearnerSession} from '../auth/LearnerSession';

/** Explicit diagnostic only; never mounts unless requested by the owner via URL. */
export function PreviewConfigurationCheck(){
 const {userId}=useLearnerSession();
 const [status,setStatus]=useState('');const [busy,setBusy]=useState(false);const active=useRef<AbortController|null>(null);
 useEffect(()=>{
  const {data}=supabase.auth.onAuthStateChange(()=>{active.current?.abort();setStatus('');setBusy(false);});
  return ()=>{active.current?.abort();data.subscription.unsubscribe();};
 },[userId]);
 async function check(){
  active.current?.abort();const controller=new AbortController();active.current=controller;setBusy(true);setStatus('Checking…');
  const timer=setTimeout(()=>{controller.abort();if(active.current===controller){setStatus('Check timed out. Try again.');setBusy(false);}},15000);
  try{
   const {data}=await supabase.auth.getSession();if(controller.signal.aborted)return;
   if(data.session?.user.id!==userId)throw Error();
   const response=await fetch('/api/preview-configuration',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},body:'{}',cache:'no-store',redirect:'error',signal:controller.signal});
   const result=await response.json();if(controller.signal.aborted)return;
   const {data:current}=await supabase.auth.getSession();if(controller.signal.aborted)return;
   if(current.session?.user.id!==userId||!response.ok||result.status!=='configuration_verified'||result.authenticated!==true||result.serviceCredentialVerified!==true||result.preflightCryptoVerified!==true||result.admissionClosed!==true||result.providerCalls!==0)throw Error();
   setStatus('Configuration verified. Signed-in access, server key and encryption passed. New session admission remains closed. No paid calls.');
  }catch{if(!controller.signal.aborted)setStatus('Configuration could not be verified. No session was started.');}
  finally{clearTimeout(timer);if(active.current===controller&&!controller.signal.aborted)setBusy(false);}
 }
 return <section className="priority-note" aria-label="Preview configuration"><strong>Preview connection check</strong><p>Checks this account and server configuration without starting a session.</p><button onClick={()=>void check()} disabled={busy}>Check configuration</button><p role="status">{status}</p></section>;
}
