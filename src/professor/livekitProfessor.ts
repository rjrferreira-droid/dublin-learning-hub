import { Room, RoomEvent, type RemoteAudioTrack, Track } from 'livekit-client';
import { supabase } from '../services/supabase';
import type { TutorSessionRequest } from '../services/contracts';
import { observedProfessorState, type ProfessorVoiceState } from './voiceState';
import {sameSessionPreparation} from '../learning/sessionPreparation';

type ProfessorTokenResponse = {
 serverUrl:string;token:string;roomName:string;participantIdentity:string;
 sessionId:string;maxSessionSeconds:number;lessonId:string|null;mode:TutorSessionRequest['mode'];
 professorProfile:'finance'|'payroll'|'english';validationMode:boolean;dispatchId?:string|null;
};
export type ProfessorConnection = {
 room:Room;roomName:string;participantIdentity:string;sessionId:string;maxSessionSeconds:number;
 professorProfile:ProfessorTokenResponse['professorProfile'];validationMode:boolean;disconnect:()=>Promise<void>;setMicrophoneEnabled:(enabled:boolean)=>Promise<void>;
};
function errorMessage(code:string):string {
 if(code==='professor_not_configured')return 'Professor voice infrastructure is not configured yet.';
 if(code==='professor_agent_dispatch_failed')return 'The Professor agent could not be started. Please try again.';
 if(code==='professor_learner_mismatch')return 'The displayed learner does not match your signed-in account. Return to your own profile before starting.';
 if(code==='professor_track_forbidden')return 'This Professor track is not available for the authenticated learner profile.';
 if(code==='professor_lesson_forbidden')return 'This lesson is not available to the authenticated learner profile.';
 if(code==='invalid_professor_request')return 'This Professor session request is not valid.';
 if(code==='invalid_authentication'||code==='missing_authentication')return 'Sign in again before starting the Professor.';
 return code||'Professor connection failed.';
}
function requireNotAborted(signal?:AbortSignal){if(signal?.aborted)throw new DOMException('Professor connection cancelled.','AbortError');}
async function requestProfessorToken(request:TutorSessionRequest,signal?:AbortSignal,expectedUserId?:string):Promise<ProfessorTokenResponse>{
 requireNotAborted(signal);
 const {data,error}=await supabase.auth.getSession();requireNotAborted(signal);
 if(error)throw error;
 if(!data.session?.access_token)throw new Error('Sign in before starting the Professor.');
 if(expectedUserId&&data.session.user.id!==expectedUserId)throw new Error('The signed-in account changed. Start again from the correct account.');
 const response=await fetch('/api/livekit-token',{method:'POST',signal,headers:{'content-type':'application/json',authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify({lessonId:request.lessonId,learnerId:request.learnerId,track:request.track,mode:request.mode,languageProfile:request.languageProfile,validationMode:request.validationMode===true,sessionPreparation:request.sessionPreparation})});
 const body=await response.json().catch(()=>({}));requireNotAborted(signal);
 if(!response.ok)throw new Error(errorMessage(typeof body?.error==='string'?body.error:'professor_connection_failed'));
 if(typeof body.sessionId!=='string'||!Number.isInteger(body.maxSessionSeconds)||body.maxSessionSeconds<60||body.maxSessionSeconds>1200||typeof body.roomName!=='string'||typeof body.validationMode!=='boolean')throw new Error('Professor session confirmation is incomplete. No microphone was opened.');
 if(body.roomName.startsWith('validation:')!==body.validationMode||(request.validationMode===true&&!body.validationMode))throw new Error('Validation protection could not be confirmed. No microphone was opened.');
 if(request.sessionPreparation && (!body.sessionPreparation || !sameSessionPreparation(request.sessionPreparation,body.sessionPreparation)))throw new Error('Session preferences could not be confirmed. No microphone was opened.');
 return body as ProfessorTokenResponse;
}
export async function connectProfessor(request:TutorSessionRequest,options?:{
 signal?:AbortSignal;expectedUserId?:string;onRemoteAudio?:(track:RemoteAudioTrack)=>void;
 onDisconnected?:()=>void;onAudioPlaybackStatusChanged?:(canPlaybackAudio:boolean)=>void;
 onProfessorState?:(state:ProfessorVoiceState)=>void;
}):Promise<ProfessorConnection>{
 const signal=options?.signal;requireNotAborted(signal);
 const room=new Room({adaptiveStream:true,dynacast:true});
 const initialAudioUnlock=room.startAudio().catch(()=>undefined);
 let closing=false;
 let disconnectPromise:Promise<void>|null=null;
 const active=()=>!signal?.aborted&&!closing;
 const emitState=()=>{if(active())options?.onProfessorState?.(observedProfessorState([...room.remoteParticipants.values()]));};
 room.on(RoomEvent.TrackSubscribed,track=>{if(active()&&track.kind===Track.Kind.Audio)options?.onRemoteAudio?.(track as RemoteAudioTrack);});
 room.on(RoomEvent.AudioPlaybackStatusChanged,()=>{if(active())options?.onAudioPlaybackStatusChanged?.(room.canPlaybackAudio);});
 room.on(RoomEvent.ParticipantAttributesChanged,emitState);
 room.on(RoomEvent.ParticipantConnected,emitState);
 room.on(RoomEvent.ParticipantDisconnected,emitState);
 room.on(RoomEvent.Reconnecting,()=>{if(active())options?.onProfessorState?.('reconnecting');});
 room.on(RoomEvent.Reconnected,emitState);
 room.on(RoomEvent.Disconnected,()=>{if(active())options?.onDisconnected?.();});
 function disconnect():Promise<void>{
  if(disconnectPromise)return disconnectPromise;
  closing=true;signal?.removeEventListener('abort',onAbort);
  disconnectPromise=(async()=>{
   await room.localParticipant.setMicrophoneEnabled(false).catch(()=>undefined);
   await room.disconnect();
  })();
  return disconnectPromise;
 }
 function onAbort(){void disconnect().catch(()=>undefined);}
 signal?.addEventListener('abort',onAbort,{once:true});
 try{
  const credentials=await requestProfessorToken(request,signal,options?.expectedUserId);requireNotAborted(signal);
  await room.connect(credentials.serverUrl,credentials.token);requireNotAborted(signal);
  await initialAudioUnlock;requireNotAborted(signal);
  options?.onAudioPlaybackStatusChanged?.(room.canPlaybackAudio);
  emitState();
  await room.localParticipant.setMicrophoneEnabled(true);requireNotAborted(signal);
  async function setMicrophoneEnabled(enabled:boolean){
   if(!active())throw new Error('Professor connection is no longer active.');
   await room.localParticipant.setMicrophoneEnabled(enabled);
   if(!active()){await room.localParticipant.setMicrophoneEnabled(false).catch(()=>undefined);throw new Error('Professor connection changed.');}
  }
  return {room,roomName:credentials.roomName,participantIdentity:credentials.participantIdentity,sessionId:credentials.sessionId,maxSessionSeconds:credentials.maxSessionSeconds,professorProfile:credentials.professorProfile,validationMode:credentials.validationMode,disconnect,setMicrophoneEnabled};
 }catch(cause){await disconnect().catch(()=>undefined);throw cause;}
}
