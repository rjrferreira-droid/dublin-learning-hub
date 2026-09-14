/** Shared orchestration for the undeployed atomic Audio Edge candidate.
 * The supplied RPC client must implement the reviewed atomic SQL contract.
 * Providers/storage are injected; tests supply fictional dependencies exclusively.
 */
type RpcClient={rpc:(name:string,args:Record<string,unknown>)=>PromiseLike<{data:unknown;error:unknown}>};
export type AudioAttemptInput={attemptId:string;userId:string;lessonId:string;contentVersion:number;reservationUsd:number;estimatedCostUsd:number;characters:number};
type DurableAsset={attemptId:string;storagePath:string};
export class AudioAttemptError extends Error {
 readonly code:string;
 constructor(code:string){super(code);this.code=code;}
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function runPremiumAudioAttempt<T>(db:RpcClient,input:AudioAttemptInput,dependencies:{
 prepare?:()=>Promise<void>;
 generate:()=>Promise<T>;
 store:(generated:T,identity:{attemptId:string;storagePath:string})=>Promise<DurableAsset>;
}):Promise<DurableAsset>{
 if(![input.attemptId,input.userId,input.lessonId].every(x=>typeof x==='string'&&uuid.test(x))
  ||!Number.isSafeInteger(input.contentVersion)||input.contentVersion<1
  ||!Number.isFinite(input.reservationUsd)||input.reservationUsd<0.10||input.reservationUsd>10
  ||!Number.isFinite(input.estimatedCostUsd)||input.estimatedCostUsd<0||input.estimatedCostUsd>input.reservationUsd
  ||!Number.isSafeInteger(input.characters)||input.characters<1||input.characters>20000)throw new AudioAttemptError('invalid_audio_attempt');
 const storagePath=`lessons/${input.lessonId}/commentary-v${input.contentVersion}.mp3`;
 let admitted=false,settled=false,admissionUncertain=false;
 try{
  admissionUncertain=true;
  const start=await db.rpc('begin_premium_audio_attempt_v2',{p_attempt_id:input.attemptId,p_user_id:input.userId,p_lesson_id:input.lessonId,p_content_version:input.contentVersion,p_reservation_usd:input.reservationUsd});
  if(start.error)throw new AudioAttemptError('audio_admission_unavailable');
  const data=start.data as Record<string,unknown>|null;
  if(data?.allowed===false){admissionUncertain=false;throw new AudioAttemptError(typeof data.reason==='string'?data.reason:'audio_admission_denied');}
  if(data?.allowed!==true||data.attemptId!==input.attemptId||data.state!=='reserved'||data.reservationUsd!==input.reservationUsd)throw new AudioAttemptError('audio_admission_invalid');
  admitted=true;admissionUncertain=false;
  await dependencies.prepare?.();
  // A committed one-shot submission fence must be acknowledged before invoking the provider.
  // A lost acknowledgement never authorizes a retry, even with the same attempt ID.
  const submission=await db.rpc('mark_premium_audio_submitted_v2',{p_attempt_id:input.attemptId});
  if(submission.error||submission.data!==true)throw new AudioAttemptError('audio_submission_unconfirmed');
  const generated=await dependencies.generate();
  // Store the attempt ID with the durable object so reconciliation can identify this exact cost.
  const asset=await dependencies.store(generated,{attemptId:input.attemptId,storagePath});
  if(asset?.attemptId!==input.attemptId||asset.storagePath!==storagePath)throw new AudioAttemptError('audio_asset_identity_mismatch');
  const receipt=await db.rpc('settle_premium_audio_attempt_v2',{p_attempt_id:input.attemptId,p_estimated_cost_usd:input.estimatedCostUsd,p_characters:input.characters});
  if(receipt.error||receipt.data!==true)throw new AudioAttemptError('audio_receipt_unconfirmed');
  settled=true;
  return asset;
 }finally{
  if(!settled&&(admitted||admissionUncertain)){
   // SQL cancels only never-submitted work; submitted/uncertain obligations remain held.
   // Failure here is not proof that no provider work or charge exists.
   try{await db.rpc('close_premium_audio_attempt_v2',{p_attempt_id:input.attemptId});}catch{/* Hold/lease is preserved in SQL; no paid retry. */}
  }
 }
}
