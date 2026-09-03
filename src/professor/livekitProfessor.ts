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
};

export type ProfessorConnection = {
  room: Room;
  roomName: string;
  participantIdentity: string;
  disconnect: () => Promise<void>;
};

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
    body: JSON.stringify({ lessonId: request.lessonId, mode: request.mode }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = typeof body?.error === 'string' ? body.error : 'professor_connection_failed';
    throw new Error(code === 'professor_not_configured' ? 'Professor voice infrastructure is not configured yet.' : code);
  }

  return body as ProfessorTokenResponse;
}

export async function connectProfessor(
  request: TutorSessionRequest,
  options?: { onRemoteAudio?: (track: RemoteAudioTrack) => void; onDisconnected?: () => void },
): Promise<ProfessorConnection> {
  const credentials = await requestProfessorToken(request);

  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  });

  room.on(RoomEvent.TrackSubscribed, (track) => {
    if (track.kind === Track.Kind.Audio) options?.onRemoteAudio?.(track as RemoteAudioTrack);
  });
  room.on(RoomEvent.Disconnected, () => options?.onDisconnected?.());

  await room.connect(credentials.serverUrl, credentials.token);
  await room.localParticipant.setMicrophoneEnabled(true);

  return {
    room,
    roomName: credentials.roomName,
    participantIdentity: credentials.participantIdentity,
    disconnect: async () => {
      await room.localParticipant.setMicrophoneEnabled(false).catch(() => undefined);
      room.disconnect();
    },
  };
}
