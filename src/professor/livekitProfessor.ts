import { Room, RoomEvent, type RemoteAudioTrack, Track } from 'livekit-client';
import { supabase } from '../services/supabase';
import type { TutorSessionRequest } from '../services/contracts';

type ProfessorTokenResponse = {
  serverUrl: string;
  token: string;
  roomName: string;
  participantIdentity: string;
  lessonId: string | null;
  mode: TutorSessionRequest['mode'];
  professorProfile: 'finance' | 'payroll' | 'english';
  validationMode?: boolean;
  dispatchId?: string | null;
};

export type ProfessorConnection = {
  room: Room;
  roomName: string;
  participantIdentity: string;
  professorProfile: ProfessorTokenResponse['professorProfile'];
  validationMode: boolean;
  disconnect: () => Promise<void>;
};

function errorMessage(code: string): string {
  if (code === 'professor_not_configured') return 'Professor voice infrastructure is not configured yet.';
  if (code === 'professor_agent_dispatch_failed') return 'The Professor agent could not be started. Please try again.';
  if (code === 'professor_track_forbidden') return 'This Professor track is not available for the authenticated learner profile.';
  if (code === 'professor_lesson_forbidden') return 'This lesson is not available to the authenticated learner profile.';
  if (code === 'invalid_professor_request') return 'This Professor session request is not valid.';
  if (code === 'invalid_authentication' || code === 'missing_authentication') return 'Sign in again before starting the Professor.';
  return code || 'Professor connection failed.';
}

async function requestProfessorToken(request: TutorSessionRequest): Promise<ProfessorTokenResponse> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error('Sign in before starting the Professor.');

  const response = await fetch('/api/livekit-token', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      lessonId: request.lessonId,
      track: request.track,
      mode: request.mode,
      languageProfile: request.languageProfile,
      validationMode: request.validationMode === true,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = typeof body?.error === 'string' ? body.error : 'professor_connection_failed';
    throw new Error(errorMessage(code));
  }

  return body as ProfessorTokenResponse;
}

export async function connectProfessor(
  request: TutorSessionRequest,
  options?: {
    onRemoteAudio?: (track: RemoteAudioTrack) => void;
    onDisconnected?: () => void;
    onAudioPlaybackStatusChanged?: (canPlaybackAudio: boolean) => void;
  },
): Promise<ProfessorConnection> {
  // Create the room and unlock its audio context before the first network await.
  // That keeps startAudio inside the original click/tap gesture, which browsers
  // (especially Safari/iOS and some Chrome configurations) require for playback.
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  });
  const initialAudioUnlock = room.startAudio().catch(() => undefined);

  room.on(RoomEvent.TrackSubscribed, (track) => {
    if (track.kind === Track.Kind.Audio) options?.onRemoteAudio?.(track as RemoteAudioTrack);
  });
  room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
    options?.onAudioPlaybackStatusChanged?.(room.canPlaybackAudio);
  });
  room.on(RoomEvent.Disconnected, () => options?.onDisconnected?.());

  const credentials = await requestProfessorToken(request);
  await room.connect(credentials.serverUrl, credentials.token);
  await initialAudioUnlock;
  options?.onAudioPlaybackStatusChanged?.(room.canPlaybackAudio);
  await room.localParticipant.setMicrophoneEnabled(true);

  return {
    room,
    roomName: credentials.roomName,
    participantIdentity: credentials.participantIdentity,
    professorProfile: credentials.professorProfile,
    validationMode: credentials.validationMode === true,
    disconnect: async () => {
      await room.localParticipant.setMicrophoneEnabled(false).catch(() => undefined);
      room.disconnect();
    },
  };
}
