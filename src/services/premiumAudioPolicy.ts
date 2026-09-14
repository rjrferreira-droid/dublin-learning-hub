export type PremiumAudioErrorCode =
  | 'authentication-required'
  | 'forbidden'
  | 'lesson-unavailable'
  | 'budget-reached'
  | 'provider-not-configured'
  | 'generation-in-progress'
  | 'source-changed'
  | 'generation-failed'
  | 'upload-failed'
  | 'network-failed'
  | 'invalid-response'
  | 'unknown';
export type PremiumAudioErrorPolicy={code:PremiumAudioErrorCode;message:string;retryable:boolean};
export function premiumAudioBackendErrorPolicy(code:string|null,status?:number):PremiumAudioErrorPolicy{
 if(status===401||code==='unauthorized')return {code:'authentication-required',message:'Sign in again before loading Premium Audio.',retryable:false};
 if(status===403||code==='forbidden')return {code:'forbidden',message:'This lesson audio is not available for the active learner profile.',retryable:false};
 if(code==='lesson_not_found'||code==='audio_script_missing')return {code:'lesson-unavailable',message:'This lesson does not have a publishable Premium Audio script yet.',retryable:false};
 if(code==='ai_budget_reached'||code==='global_ai_budget_reached'||code==='premium_audio_budget_reached')return {code:'budget-reached',message:'The protected monthly AI budget does not have enough capacity for new narration. Existing cached audio remains available.',retryable:false};
 if(code==='audio_generation_in_progress')return {code:'generation-in-progress',message:'This lesson narration is already being prepared. Try again shortly.',retryable:true};
 if(code==='audio_source_changed')return {code:'source-changed',message:'The lesson changed while narration was being prepared. Reload the lesson and try again.',retryable:true};
 if(code==='openai_not_configured')return {code:'provider-not-configured',message:'Premium Audio generation is not configured in the backend yet.',retryable:false};
 if(code==='tts_failed')return {code:'generation-failed',message:'The narration provider could not generate audio. Retrying is safe when no other generation is in progress.',retryable:true};
 if(code==='audio_upload_failed')return {code:'upload-failed',message:'Narration was generated but could not be stored. Retrying is safe after the backend reports that no generation is still in progress.',retryable:true};
 return {code:'unknown',message:'Premium Audio could not be loaded.',retryable:status==null||status>=500};
}
