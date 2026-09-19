import {supabase,supabasePublishableKey,supabaseUrl} from './supabase';
import {parseSessionReceipt,type SessionReceipt} from '../professor/sessionReceipt';
export async function loadSessionReceipt(sessionId:string,expectedUserId:string,signal:AbortSignal):Promise<SessionReceipt>{
 const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
 if(!uuid.test(sessionId)||!uuid.test(expectedUserId))throw new Error('invalid_session_identity');
 const before=await supabase.auth.getSession();if(signal.aborted)throw new DOMException('Cancelled','AbortError');
 if(before.error||before.data.session?.user.id!==expectedUserId)throw new Error('learner_account_changed');
 const response=await fetch(`${supabaseUrl}/functions/v1/professor-session-receipt?sessionId=${encodeURIComponent(sessionId)}`,{method:'GET',headers:{Authorization:`Bearer ${before.data.session.access_token}`,apikey:supabasePublishableKey},signal,cache:'no-store',redirect:'error'});
 if(!response.ok)throw new Error(response.status===404?'receipt_not_ready':'receipt_unavailable');
 const parsed=parseSessionReceipt(await response.json(),sessionId);if(signal.aborted)throw new DOMException('Cancelled','AbortError');
 const after=await supabase.auth.getSession();if(signal.aborted)throw new DOMException('Cancelled','AbortError');
 if(after.error||after.data.session?.user.id!==expectedUserId)throw new Error('learner_account_changed');
 return parsed;
}
