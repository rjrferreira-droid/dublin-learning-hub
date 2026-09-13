export type StoredCorrection={label:string;pattern:string;example:string;correction:string};
export type StoredFeedbackDetails={assessmentConfidence:number|null;corrections:StoredCorrection[]};
export function storedFeedbackDetails(value:unknown):StoredFeedbackDetails{
 const input=value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
 const c=input.assessmentConfidence;
 const assessmentConfidence=typeof c==='number'&&Number.isFinite(c)&&c>=0&&c<=100?Math.round(c*10)/10:null;
 const labels:Record<string,string>={technical:'Technical reasoning',grammar:'Grammar',vocabulary:'Vocabulary',register:'Communication style'};
 const clean=(v:unknown,n:number)=>typeof v==='string'?v.trim().slice(0,n):'';
 const corrections:StoredCorrection[]=[];
 for(const value of Array.isArray(input.errors)?input.errors.slice(0,24):[]){
  if(!value||typeof value!=='object'||Array.isArray(value))continue;
  const row=value as Record<string,unknown>,domain=typeof row.domain==='string'?row.domain:'';
  if(!Object.prototype.hasOwnProperty.call(labels,domain))continue;
  const pattern=clean(row.pattern,300),example=clean(row.example,900),correction=clean(row.correction,900);
  if(!pattern||!example||!correction)continue;
  corrections.push({label:labels[domain],pattern,example,correction});if(corrections.length===6)break;
 }
 return {assessmentConfidence,corrections};
}
export type OutcomeKind='processing'|'ready'|'saved_without_feedback'|'stopped'|'unavailable';
export type SessionOutcome={kind:OutcomeKind;sessionId:string;completedAt:string|null;validation:boolean;summary:string;strengths:string[];nextFocus:string[];details:StoredFeedbackDetails};
export type OutcomeIdentity={sessionId:string;userId:string;validation:boolean};
const object=(v:unknown):Record<string,unknown>|null=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:null;
const text=(v:unknown,max=1600)=>typeof v==='string'?v.trim().slice(0,max):'';
const list=(v:unknown)=>Array.isArray(v)?v.filter((x):x is string=>typeof x==='string').map(x=>text(x,320)).filter(Boolean).slice(0,3):[];
export function emptySessionOutcome(id:OutcomeIdentity,kind:OutcomeKind='processing'):SessionOutcome{
 return {kind,sessionId:id.sessionId,completedAt:null,validation:id.validation,summary:'',strengths:[],nextFocus:[],details:storedFeedbackDetails(null)};
}
/** A read of this specific user's session is evidence of storage, not provider settlement. */
export function parseSessionOutcome(value:unknown,id:OutcomeIdentity):SessionOutcome{
 if(value===null)return emptySessionOutcome(id);
 const row=object(value);
 if(!row||row.id!==id.sessionId||row.user_id!==id.userId||typeof row.room_name!=='string'
   ||row.room_name.startsWith('validation:')!==id.validation)throw new Error('session_outcome_identity_mismatch');
 if(row.status==='active')return emptySessionOutcome(id);
 if(row.status==='abandoned')return emptySessionOutcome(id,'stopped');
 if(row.status!=='completed'||typeof row.completed_at!=='string'||!Number.isFinite(Date.parse(row.completed_at)))throw new Error('session_outcome_invalid');
 const feedback=object(row.final_feedback);
 const summary=text(feedback?.summary);const strengths=list(feedback?.strengths);const nextFocus=list(feedback?.nextSessionFocus);
 return {...emptySessionOutcome(id,summary||strengths.length||nextFocus.length?'ready':'saved_without_feedback'),completedAt:row.completed_at,summary,strengths,nextFocus,details:storedFeedbackDetails(feedback)};
}
export const OUTCOME_DELAYS_MS=Object.freeze([0,1500,3000,5000,8000,10000]);
export async function pollSessionOutcome(
 read:()=>Promise<SessionOutcome>,onUpdate:(value:SessionOutcome)=>void,
 options:{signal:AbortSignal;wait?:(ms:number,signal:AbortSignal)=>Promise<void>},
):Promise<'finished'|'waiting'|'cancelled'>{
 const wait=options.wait??((ms:number,signal:AbortSignal)=>new Promise<void>((resolve,reject)=>{
  if(signal.aborted){reject(new DOMException('Cancelled','AbortError'));return;}
  const stop=()=>{clearTimeout(timer);signal.removeEventListener('abort',stop);reject(new DOMException('Cancelled','AbortError'));};
  const timer=setTimeout(()=>{signal.removeEventListener('abort',stop);resolve();},ms);signal.addEventListener('abort',stop,{once:true});
 }));
 for(const delay of OUTCOME_DELAYS_MS){
  if(options.signal.aborted)return 'cancelled';
  try{await wait(delay,options.signal);}catch{if(options.signal.aborted)return 'cancelled';throw new Error('outcome_wait_failed');}
  if(options.signal.aborted)return 'cancelled';
  const result=await read();
  if(options.signal.aborted)return 'cancelled';
  onUpdate(result);
  if(result.kind!=='processing')return 'finished';
 }
 return 'waiting';
}
