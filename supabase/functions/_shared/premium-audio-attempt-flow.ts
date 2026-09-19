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
 // Capture only the reviewed scalar contract before the first asynchronous boundary.
 // Caller mutations must never redirect submission, settlement or cleanup to another attempt.
 const request=Object.freeze({attemptId:input.attemptId,userId:input.userId,
  lessonId:input.lessonId,contentVersion:input.contentVersion,
  reservationUsd:input.reservationUsd,estimatedCostUsd:input.estimatedCostUsd,
  characters:input.characters});
 if(![request.attemptId,request.userId,request.lessonId].every(x=>typeof x==='string'&&uuid.test(x))
  ||!Number.isSafeInteger(request.contentVersion)||request.contentVersion<1
  ||!Number.isFinite(request.reservationUsd)||request.reservationUsd<0.10||request.reservationUsd>10
  ||!Number.isFinite(request.estimatedCostUsd)||request.estimatedCostUsd<0||request.estimatedCostUsd>request.reservationUsd
  ||!Number.isSafeInteger(request.characters)||request.characters<1||request.characters>20000)throw new AudioAttemptError('invalid_audio_attempt');
 const storagePath=`lessons/${request.lessonId}/commentary-v${request.contentVersion}.mp3`;
 let admitted=false,settled=false,admissionUncertain=false;
 try{
  admissionUncertain=true;
  const start=await db.rpc('begin_premium_audio_attempt_v2',{p_attempt_id:request.attemptId,p_user_id:request.userId,p_lesson_id:request.lessonId,p_content_version:request.contentVersion,p_reservation_usd:request.reservationUsd});
  if(start.error)throw new AudioAttemptError('audio_admission_unavailable');
  const data=start.data as Record<string,unknown>|null;
  if(data?.allowed===false){admissionUncertain=false;throw new AudioAttemptError(typeof data.reason==='string'?data.reason:'audio_admission_denied');}
  if(data?.allowed!==true||data.attemptId!==request.attemptId||data.state!=='reserved'||data.reservationUsd!==request.reservationUsd)throw new AudioAttemptError('audio_admission_invalid');
  admitted=true;admissionUncertain=false;
  await dependencies.prepare?.();
  // A committed one-shot submission fence must be acknowledged before invoking the provider.
  // A lost acknowledgement never authorizes a retry, even with the same attempt ID.
  const submission=await db.rpc('mark_premium_audio_submitted_v2',{p_attempt_id:request.attemptId});
  if(submission.error||submission.data!==true)throw new AudioAttemptError('audio_submission_unconfirmed');
  const generated=await dependencies.generate();
  // Store the attempt ID with the durable object so reconciliation can identify this exact cost.
  const stored=await dependencies.store(generated,{attemptId:request.attemptId,storagePath});
  const asset=Object.freeze({attemptId:stored?.attemptId,storagePath:stored?.storagePath});
  if(asset?.attemptId!==request.attemptId||asset.storagePath!==storagePath)throw new AudioAttemptError('audio_asset_identity_mismatch');
  const receipt=await db.rpc('settle_premium_audio_attempt_v2',{p_attempt_id:request.attemptId,p_estimated_cost_usd:request.estimatedCostUsd,p_characters:request.characters});
  if(receipt.error||receipt.data!==true)throw new AudioAttemptError('audio_receipt_unconfirmed');
  settled=true;
  return asset;
 }finally{
  if(!settled&&(admitted||admissionUncertain)){
   // SQL cancels only never-submitted work; submitted/uncertain obligations remain held.
   // Failure here is not proof that no provider work or charge exists.
   try{await db.rpc('close_premium_audio_attempt_v2',{p_attempt_id:request.attemptId});}catch{/* Hold/lease is preserved in SQL; no paid retry. */}
  }
 }
}

/** Immutable-source attempt contract. Kept additive so the deployed v2 caller and
 * its database protocol remain byte-for-byte compatible while v3 is reviewed.
 */
export type AudioAttemptInputV3=AudioAttemptInput&{
 lessonIdentity:Readonly<{
  lessonId:string;moduleId:string;courseId:string;lessonSlug:string;
  contentVersion:number;requestedTrack:string;studyTrack:string;sequence:number;
 }>;
 sourceFingerprint:string;
 renderRevision:1;
 storagePath:string;
};
export type DurableAssetV3=Readonly<{
 attemptId:string;
 sourceFingerprint:string;
 renderRevision:1;
 storagePath:string;
}>;
const sha256Lowercase=/^[0-9a-f]{64}$/;
const uuidLowercase=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const lessonIdentityKeys=['lessonId','moduleId','courseId','lessonSlug','contentVersion','requestedTrack','studyTrack','sequence'] as const;
const lessonTracks:Record<string,string>={rafael_finance:'finance',viviane_payroll:'payroll',english_academy:'english'};
const hasExactKeys=(value:unknown,keys:readonly string[])=>value!==null&&typeof value==='object'&&!Array.isArray(value)
 &&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
function captureLessonIdentity(value:unknown){
 if(!hasExactKeys(value,lessonIdentityKeys))return null;
 const identity=value as Record<(typeof lessonIdentityKeys)[number],unknown>;
 if(![identity.lessonId,identity.moduleId,identity.courseId].every(part=>typeof part==='string'&&uuidLowercase.test(part))
  ||typeof identity.lessonSlug!=='string'||!identity.lessonSlug.trim()
  ||!Number.isSafeInteger(identity.contentVersion)||Number(identity.contentVersion)<1||Number(identity.contentVersion)>100000
  ||!Number.isSafeInteger(identity.sequence)||Number(identity.sequence)<2||Number(identity.sequence)>8
  ||typeof identity.requestedTrack!=='string'||!Object.hasOwn(lessonTracks,identity.requestedTrack)
  ||typeof identity.studyTrack!=='string'||lessonTracks[identity.requestedTrack]!==identity.studyTrack)return null;
 return Object.freeze({lessonId:identity.lessonId as string,moduleId:identity.moduleId as string,
  courseId:identity.courseId as string,lessonSlug:identity.lessonSlug,contentVersion:identity.contentVersion as number,
  requestedTrack:identity.requestedTrack,studyTrack:identity.studyTrack,sequence:identity.sequence as number});
}

export async function runPremiumAudioAttemptV3<T>(db:RpcClient,input:AudioAttemptInputV3,dependencies:{
 /** Provider-free server re-read that must reject a changed authored source. */
 revalidateSource:(identity:DurableAssetV3)=>Promise<void>;
 generate:(identity:DurableAssetV3)=>Promise<T>;
 store:(generated:T,identity:DurableAssetV3)=>Promise<DurableAssetV3>;
}):Promise<Readonly<DurableAssetV3>>{
 // Capture every identity, cost and receipt scalar before the first await. The
 // caller may mutate its object later, but it cannot redirect any v3 operation.
 const lessonIdentity=captureLessonIdentity(input.lessonIdentity);
 const request=Object.freeze({attemptId:input.attemptId,userId:input.userId,
  lessonId:input.lessonId,contentVersion:input.contentVersion,
  reservationUsd:input.reservationUsd,estimatedCostUsd:input.estimatedCostUsd,
  characters:input.characters,sourceFingerprint:input.sourceFingerprint,
  renderRevision:input.renderRevision,storagePath:input.storagePath,lessonIdentity});
 const callbacks=Object.freeze({revalidateSource:dependencies.revalidateSource,
  generate:dependencies.generate,store:dependencies.store});
 const expectedStoragePath=`lessons/${request.lessonId}/commentary-v${request.contentVersion}-${request.sourceFingerprint}-r1.mp3`;
 if(![request.attemptId,request.userId,request.lessonId].every(x=>typeof x==='string'&&uuid.test(x))
  ||!Number.isSafeInteger(request.contentVersion)||request.contentVersion<1
  ||!Number.isFinite(request.reservationUsd)||request.reservationUsd<0.10||request.reservationUsd>10
  ||request.reservationUsd!==Number(request.reservationUsd.toFixed(6))
  ||!Number.isFinite(request.estimatedCostUsd)||request.estimatedCostUsd<0||request.estimatedCostUsd>request.reservationUsd
  ||request.estimatedCostUsd!==Number(request.estimatedCostUsd.toFixed(6))
  ||!Number.isSafeInteger(request.characters)||request.characters<1||request.characters>20000
  ||!request.lessonIdentity||request.lessonIdentity.lessonId!==request.lessonId
  ||request.lessonIdentity.contentVersion!==request.contentVersion
  ||typeof request.sourceFingerprint!=='string'||!sha256Lowercase.test(request.sourceFingerprint)
  ||request.renderRevision!==1||request.storagePath!==expectedStoragePath
  ||typeof callbacks.revalidateSource!=='function'||typeof callbacks.generate!=='function'
  ||typeof callbacks.store!=='function')throw new AudioAttemptError('invalid_audio_attempt_v3');
 const durableIdentity=Object.freeze({attemptId:request.attemptId,
  sourceFingerprint:request.sourceFingerprint,renderRevision:request.renderRevision,
  storagePath:request.storagePath});
 let admitted=false,settled=false,admissionUncertain=false;
 try{
  admissionUncertain=true;
  const start=await db.rpc('begin_premium_audio_attempt_v3',{p_attempt_id:request.attemptId,
   p_user_id:request.userId,p_lesson_id:request.lessonId,p_content_version:request.contentVersion,
   p_reservation_usd:request.reservationUsd,p_source_fingerprint:request.sourceFingerprint,
   p_render_revision:request.renderRevision,p_storage_path:request.storagePath,
   p_lesson_identity:request.lessonIdentity});
  if(start.error)throw new AudioAttemptError('audio_admission_unavailable');
  const data=start.data as Record<string,unknown>|null;
  if(data?.allowed===false){admissionUncertain=false;throw new AudioAttemptError(typeof data.reason==='string'?data.reason:'audio_admission_denied');}
  if(!hasExactKeys(data,['allowed','attemptId','state','reservationUsd'])||data?.allowed!==true
   ||data.attemptId!==request.attemptId||data.state!=='reserved'||data.reservationUsd!==request.reservationUsd)
   throw new AudioAttemptError('audio_admission_invalid');
  admitted=true;admissionUncertain=false;
  // This hook is only a server-owned DB/source comparison. Paid provider work
  // belongs exclusively in generate(), which remains behind the committed mark.
  await callbacks.revalidateSource(durableIdentity);
  // No paid provider may run until the immutable v3 submission fence commits.
  const submission=await db.rpc('mark_premium_audio_submitted_v3',{p_attempt_id:request.attemptId,
   p_source_fingerprint:request.sourceFingerprint,p_render_revision:request.renderRevision,
   p_storage_path:request.storagePath});
  const submitted=submission.data as Record<string,unknown>|null;
  if(submission.error||!hasExactKeys(submitted,['allowed','state'])||submitted?.allowed!==true||submitted.state!=='submitted')
   throw new AudioAttemptError('audio_submission_unconfirmed');
  const generated=await callbacks.generate(durableIdentity);
  const stored=await callbacks.store(generated,durableIdentity);
  if(!hasExactKeys(stored,['attemptId','sourceFingerprint','renderRevision','storagePath']))throw new AudioAttemptError('audio_asset_identity_mismatch');
  const asset=Object.freeze({attemptId:stored?.attemptId,sourceFingerprint:stored?.sourceFingerprint,
   renderRevision:stored?.renderRevision,storagePath:stored?.storagePath});
  if(asset.attemptId!==durableIdentity.attemptId||asset.sourceFingerprint!==durableIdentity.sourceFingerprint
   ||asset.renderRevision!==durableIdentity.renderRevision||asset.storagePath!==durableIdentity.storagePath)throw new AudioAttemptError('audio_asset_identity_mismatch');
  const receipt=await db.rpc('settle_premium_audio_attempt_v3',{p_attempt_id:request.attemptId,
   p_source_fingerprint:request.sourceFingerprint,p_render_revision:request.renderRevision,
   p_storage_path:request.storagePath,p_estimated_cost_usd:request.estimatedCostUsd,
   p_characters:request.characters});
  const receiptData=receipt.data as Record<string,unknown>|null;
  if(receipt.error||!hasExactKeys(receiptData,['settled','state','receiptRequestId'])
   ||receiptData?.settled!==true||receiptData.state!=='settled'
   ||receiptData.receiptRequestId!==`premium-audio-v3:${request.attemptId}`)throw new AudioAttemptError('audio_receipt_unconfirmed');
  settled=true;
  return asset;
 }finally{
  if(!settled&&(admitted||admissionUncertain)){
   // The v3 close contract only cancels a never-submitted reservation. Submitted
   // or acknowledgement-uncertain work remains held and must never be retried.
   try{await db.rpc('close_premium_audio_attempt_v3',{p_attempt_id:request.attemptId,
    p_source_fingerprint:request.sourceFingerprint,p_render_revision:request.renderRevision,
    p_storage_path:request.storagePath});}catch{/* Preserve the hold; a retry could duplicate paid work. */}
  }
 }
}
