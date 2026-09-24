export const VALIDATION_MAX_SESSION_SECONDS = 180;
/** Use the persisted startup result, including a server-side validation flag, not only browser intent. */
export function voiceValidationPlan(startup: {validationMode:boolean;roomName:string;budget:{maxSessionSeconds:number}}) {
 const roomIsValidation = startup.roomName.startsWith('validation:');
 if(roomIsValidation !== startup.validationMode) throw new Error('professor_validation_state_mismatch');
 const limit = startup.budget.maxSessionSeconds;
 if(!Number.isInteger(limit) || limit < 60 || limit > 1200) throw new Error('professor_session_limit_invalid');
 return {validationMode:startup.validationMode,maxSessionSeconds:startup.validationMode ? Math.min(limit,VALIDATION_MAX_SESSION_SECONDS) : limit};
}
