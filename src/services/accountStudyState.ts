import {supabase} from './supabase';

export const ACCOUNT_STUDY_NAMESPACES={curriculum:'curriculum-v3',mockExam:'acca-fr-mock-v1'} as const;
export type AccountStudyNamespace=typeof ACCOUNT_STUDY_NAMESPACES[keyof typeof ACCOUNT_STUDY_NAMESPACES]|`english-unit.${string}`;
type JsonObject=Record<string,unknown>;

const pendingWrites=new Map<string,Promise<unknown>>();
const namespacePattern=/^[a-z0-9][a-z0-9.-]{2,63}$/;

function boundedPayload(payload:unknown):JsonObject{
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('study_state_payload_invalid');
 const encoded=JSON.stringify(payload);
 if(new TextEncoder().encode(encoded).byteLength>240_000)throw new Error('study_state_payload_too_large');
 return payload as JsonObject;
}

async function requireCurrentUser(expectedUserId:string){
 const {data,error}=await supabase.auth.getUser();
 if(error||!data.user||data.user.id!==expectedUserId)throw new Error('study_state_account_changed');
}

export async function loadAccountStudyState(userId:string,namespace:AccountStudyNamespace):Promise<unknown|null>{
 if(!namespacePattern.test(namespace))throw new Error('study_state_namespace_invalid');
 await requireCurrentUser(userId);
 const {data,error}=await supabase.from('user_study_state').select('payload,schema_version').eq('user_id',userId).eq('namespace',namespace).maybeSingle();
 if(error)throw error;
 await requireCurrentUser(userId);
 return data?.schema_version===1?data.payload:null;
}

async function saveNow(userId:string,namespace:AccountStudyNamespace,payload:JsonObject){
 await requireCurrentUser(userId);
 const {error}=await supabase.from('user_study_state').upsert({user_id:userId,namespace,schema_version:1,payload,updated_at:new Date().toISOString()},{onConflict:'user_id,namespace'});
 if(error)throw error;
 await requireCurrentUser(userId);
}

export function saveAccountStudyState(userId:string,namespace:AccountStudyNamespace,payload:unknown):Promise<void>{
 if(!namespacePattern.test(namespace))return Promise.reject(new Error('study_state_namespace_invalid'));
 const safe=boundedPayload(payload),key=`${userId}:${namespace}`;
 const next=(pendingWrites.get(key)??Promise.resolve()).catch(()=>undefined).then(()=>saveNow(userId,namespace,safe));
 pendingWrites.set(key,next.then(()=>undefined,()=>undefined));
 return next;
}
