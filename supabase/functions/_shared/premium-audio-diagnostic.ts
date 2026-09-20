export type AudioFailurePhase='transport'|'http'|'media_type'|'media_validation';

/** Metadata only. Never retain provider bodies, credentials or narrated text. */
export function premiumAudioFailureDiagnostic(attemptId:string,phase:AudioFailurePhase,status:unknown,requestId:unknown){
 return {
  event:'premium_audio_provider_failure',
  attemptId:/^[a-f0-9-]{36}$/.test(attemptId)?attemptId:null,
  phase:['transport','http','media_type','media_validation'].includes(phase)?phase:'transport',
  httpStatus:Number.isInteger(status)&&Number(status)>=100&&Number(status)<=599?Number(status):null,
  providerRequestId:typeof requestId==='string'&&/^req_[A-Za-z0-9_-]{1,120}$/.test(requestId)?requestId:null,
 };
}
