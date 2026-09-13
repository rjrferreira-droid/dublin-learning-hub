import { Room, RoomEvent, type RemoteAudioTrack, Track } from 'livekit-client';
import { supabase } from '../services/supabase';
import type { TutorSessionRequest } from '../services/contracts';

type ProfessorTokenResponse = {
  serverUrl: string; token: string; roomName: string; participantIdentity: string;
  lessonId: string | null; mode: TutorSessionRequest['mode'];
  professorProfile: 'finance' | 'payroll' | 'english'; validationMode?: boolean; dispatchId?: string | null;
};
export type ProfessorConnection = {
  room: Room; roomName: string; participantIdentity: string;
  professorProfile: ProfessorTokenResponse['professorProfile']; validationMode: boolean;
  disconnect: () => Promise<void>;
};
function errorMessage(code: string): string {
  if (code === 'professor_not_configured') return 'Professor voice infrastructure is not configured yet.';
  if (code === 'professor_agent_dispatch_failed') return 'The Professor agent could not be started. Please try again.';
  if (code === 'professor_learner_mismatch') return 'The displayed learner does not match your signed-in account. Return to your own profile before starting.';
  if (code === 'professor_track_forbidden') return 'This Professor track is not available for the authenticated learner profile.';
  if (code === 'professor_lesson_forbidden') return 'This lesson is not available to the authenticated learner profile.';
  if (code === 'invalid_professor_request') return 'This Professor session request is not valid.';
  if (code === 'invalid_authentication' || code === 'missing_authentication') return 'Sign in again before starting the Professor.';
  return code || 'Professor connection failed.';
}
function requireNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Professor connection cancelled.', 'AbortError');
}
async function requestProfessorToken(request: TutorSessionRequest, signal?: AbortSignal, expectedUserId?: string): Promise<ProfessorTokenResponse> {
  requireNotAborted(signal);
  const { data, error } = await supabase.auth.getSession();
  requireNotAborted(signal);
  if (error) throw error;
  if (!data.session?.access_token) throw new Error('Sign in before starting the Professor.');
  if (expectedUserId && data.session.user.id !== expectedUserId) throw new Error('The signed-in account changed. Start again from the correct account.');
  const response = await fetch('/api/livekit-token', {
    method: 'POST', signal,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session.access_token}` },
    body: JSON.stringify({ lessonId:request.lessonId,learnerId:request.learnerId,track:request.track,mode:request.mode,languageProfile:request.languageProfile,validationMode:request.validationMode===true }),
  });
  const body = await response.json().catch(() => ({}));
  requireNotAborted(signal);
  if (!response.ok) throw new Error(errorMessage(typeof body?.error === 'string' ? body.error : 'professor_connection_failed'));
  return body as ProfessorTokenResponse;
}
export async function connectProfessor(request: TutorSessionRequest, options?: {
  signal?: AbortSignal; expectedUserId?: string;
  onRemoteAudio?: (track: RemoteAudioTrack) => void;
  onDisconnected?: () => void;
  onAudioPlaybackStatusChanged?: (canPlaybackAudio: boolean) => void;
}): Promise<ProfessorConnection> {
  const signal = options?.signal;
  requireNotAborted(signal);
  const room = new Room({ adaptiveStream:true,dynacast:true });
  // Preserve the iOS/Safari user gesture: unlock audio before the first await.
  const initialAudioUnlock = room.startAudio().catch(() => undefined);
  const active = () => !signal?.aborted;
  room.on(RoomEvent.TrackSubscribed, track => {
    if (active() && track.kind === Track.Kind.Audio) options?.onRemoteAudio?.(track as RemoteAudioTrack);
  });
  room.on(RoomEvent.AudioPlaybackStatusChanged, () => { if(active()) options?.onAudioPlaybackStatusChanged?.(room.canPlaybackAudio); });
  room.on(RoomEvent.Disconnected, () => { if(active()) options?.onDisconnected?.(); });
  async function disconnect() {
    signal?.removeEventListener('abort', onAbort);
    await room.localParticipant.setMicrophoneEnabled(false).catch(() => undefined);
    await room.disconnect();
  }
  function onAbort() { void disconnect().catch(() => undefined); }
  signal?.addEventListener('abort',onAbort,{once:true});
  try {
    const credentials=await requestProfessorToken(request,signal,options?.expectedUserId);
    requireNotAborted(signal);
    await room.connect(credentials.serverUrl,credentials.token);
    requireNotAborted(signal);
    await initialAudioUnlock;
    requireNotAborted(signal);
    options?.onAudioPlaybackStatusChanged?.(room.canPlaybackAudio);
    await room.localParticipant.setMicrophoneEnabled(true);
    requireNotAborted(signal);
    return {room,roomName:credentials.roomName,participantIdentity:credentials.participantIdentity,professorProfile:credentials.professorProfile,validationMode:credentials.validationMode===true,disconnect};
  } catch (cause) {
    // Also close a late connection after cancellation or a failed microphone request.
    await disconnect().catch(() => undefined);
    throw cause;
  }
}
