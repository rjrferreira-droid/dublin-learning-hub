import { supabase } from './supabase';
import { parseSessionOutcome, type OutcomeIdentity, type SessionOutcome } from '../professor/sessionOutcome';
function cancellable<T>(operation:PromiseLike<T>,signal:AbortSignal):Promise<T>{
 return new Promise((resolve,reject)=>{
  const stop=()=>reject(new DOMException('Cancelled','AbortError'));
  if(signal.aborted){stop();return;}
  signal.addEventListener('abort',stop,{once:true});
  Promise.resolve(operation).then(v=>{signal.removeEventListener('abort',stop);if(!signal.aborted)resolve(v);},e=>{signal.removeEventListener('abort',stop);reject(e);});
 });
}
/** Read-only RLS-backed lookup. No completion request, evaluation call, retry of a write or cost release. */
export async function loadSessionOutcome(id:OutcomeIdentity,parentSignal:AbortSignal):Promise<SessionOutcome>{
 const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
 if(!uuid.test(id.sessionId)||!uuid.test(id.userId))throw new Error('invalid_outcome_identity');
 const controller=new AbortController();const cancel=()=>controller.abort();
 parentSignal.addEventListener('abort',cancel,{once:true});if(parentSignal.aborted)cancel();
 const timer=setTimeout(cancel,8000);
 try{
  const before=await cancellable(supabase.auth.getSession(),controller.signal);
  if(before.error||before.data.session?.user.id!==id.userId)throw new Error('learner_account_changed');
  const response=await cancellable(supabase.from('ai_tutor_sessions')
   .select('id,user_id,room_name,status,completed_at,final_feedback')
   .eq('id',id.sessionId).eq('user_id',id.userId).abortSignal(controller.signal).maybeSingle(),controller.signal);
  if(response.error)throw new Error('session_outcome_unavailable');
  const after=await cancellable(supabase.auth.getSession(),controller.signal);
  if(after.error||after.data.session?.user.id!==id.userId)throw new Error('learner_account_changed');
  return parseSessionOutcome(response.data,id);
 }finally{clearTimeout(timer);parentSignal.removeEventListener('abort',cancel);}
}
