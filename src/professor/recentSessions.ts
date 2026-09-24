export type RecentSessionScope={userId:string;lessonId:string};
export type RecentProfessorSession={id:string;startedAt:string;status:'active'|'completed'|'abandoned';validation:boolean};
type ReadClient={auth:{getUser:()=>PromiseLike<{data:{user:{id:string}|null};error:unknown}>};from:(table:string)=>any};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validDate=(v:unknown):v is string=>typeof v==='string'&&v.length<=64&&Number.isFinite(Date.parse(v));
export const RECENT_SESSION_LIMIT=5;

export function parseRecentProfessorSessions(value:unknown,scope:RecentSessionScope):RecentProfessorSession[]{
 if(!uuid.test(scope.userId)||!uuid.test(scope.lessonId)||!Array.isArray(value)||value.length>RECENT_SESSION_LIMIT)throw Error('recent_sessions_unavailable');
 const seen=new Set<string>();
 return value.map(row=>{
  if(!row||typeof row!=='object'||typeof row.id!=='string'||!uuid.test(row.id)||seen.has(row.id)||row.user_id!==scope.userId||row.lesson_id!==scope.lessonId
   ||!validDate(row.started_at)||typeof row.room_name!=='string'||!row.room_name||row.room_name.length>200
   ||!['active','completed','abandoned'].includes(row.status)
   ||(row.status==='completed'&&!validDate(row.completed_at)))throw Error('recent_sessions_unavailable');
  seen.add(row.id);
  return {id:row.id,startedAt:row.started_at,status:row.status,validation:row.room_name.startsWith('validation:')};
 });
}

function cancellable<T>(operation:()=>PromiseLike<T>,signal:AbortSignal):Promise<T>{
 return new Promise((resolve,reject)=>{
  const stop=()=>reject(Error('recent_sessions_unavailable'));
  if(signal.aborted){stop();return;}
  signal.addEventListener('abort',stop,{once:true});
  Promise.resolve().then(()=>{if(signal.aborted)throw Error('recent_sessions_unavailable');return operation();}).then(value=>{
   signal.removeEventListener('abort',stop);if(!signal.aborted)resolve(value);
  },()=>{signal.removeEventListener('abort',stop);stop();});
 });
}

/** Bounded, owner/lesson-scoped history read. An empty result does not prove a start was cancelled. */
export async function readRecentProfessorSessions(db:ReadClient,identity:RecentSessionScope,signal:AbortSignal,timeoutMs=8000):Promise<RecentProfessorSession[]>{
 const scope={userId:identity.userId,lessonId:identity.lessonId};
 if(!uuid.test(scope.userId)||!uuid.test(scope.lessonId)||!Number.isFinite(timeoutMs)||timeoutMs<=0)throw Error('recent_sessions_unavailable');
 const controller=new AbortController();const cancel=()=>controller.abort();
 signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)cancel();
 const timer=setTimeout(cancel,timeoutMs);
 const owner=async()=>{
  const result=await cancellable(()=>db.auth.getUser(),controller.signal);
  if(result.error||result.data.user?.id!==scope.userId)throw Error('recent_sessions_unavailable');
 };
 try{
  await owner();
  const response=await cancellable(()=>db.from('ai_tutor_sessions')
   .select('id,user_id,lesson_id,room_name,status,started_at,completed_at')
   .eq('user_id',scope.userId).eq('lesson_id',scope.lessonId)
   .order('started_at',{ascending:false}).order('id',{ascending:false})
   .limit(RECENT_SESSION_LIMIT).abortSignal(controller.signal),controller.signal) as {data:unknown;error:unknown};
  if(response.error)throw Error('recent_sessions_unavailable');
  await owner();
  return parseRecentProfessorSessions(response.data,scope);
 }catch{throw Error('recent_sessions_unavailable');}
 finally{clearTimeout(timer);signal.removeEventListener('abort',cancel);}
}
