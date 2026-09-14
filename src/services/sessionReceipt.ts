import {supabase} from './supabase';
import {parseSessionReceipt,type SessionReceipt} from '../professor/sessionReceipt';
export async function loadSessionReceipt(sessionId:string,signal:AbortSignal):Promise<SessionReceipt>{
 const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
 if(!uuid.test(sessionId))throw new Error('invalid_session');
 const {data,error}=await supabase.auth.getSession();if(error||!data.session)throw new Error('authentication_required');
 const response=await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/professor-session-receipt?sessionId=${encodeURIComponent(sessionId)}`,{method:'GET',headers:{Authorization:`Bearer ${data.session.access_token}`,apikey:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY},signal,cache:'no-store'});
 if(!response.ok)throw new Error(response.status===404?'receipt_not_ready':'receipt_unavailable');
 return parseSessionReceipt(await response.json(),sessionId);
}
