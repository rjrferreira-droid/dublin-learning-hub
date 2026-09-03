import { useEffect, useRef, useState } from 'react';
import type { RemoteAudioTrack } from 'livekit-client';
import { isFeatureEnabled } from '../config/features';
import { connectProfessor, type ProfessorConnection } from '../professor/livekitProfessor';
import type { LearnerTrack, TutorSessionRequest } from '../services/contracts';

type ProfessorSessionPanelProps = {
  lessonId?: string;
  track: 'finance' | 'payroll' | 'english';
};

type SessionState = 'ready' | 'connecting' | 'listening' | 'ended' | 'error';

function trackContract(track: ProfessorSessionPanelProps['track']): { learnerTrack: LearnerTrack; mode: TutorSessionRequest['mode'] } {
  if (track === 'payroll') return { learnerTrack: 'viviane_payroll', mode: 'chapter_conversation' };
  if (track === 'english') return { learnerTrack: 'english_academy', mode: 'general_conversation' };
  return { learnerTrack: 'rafael_finance', mode: 'chapter_conversation' };
}

export function ProfessorSessionPanel({ lessonId, track }: ProfessorSessionPanelProps) {
  const enabled = isFeatureEnabled('professor');
  const [state, setState] = useState<SessionState>('ready');
  const [error, setError] = useState<string | null>(null);
  const connectionRef = useRef<ProfessorConnection | null>(null);
  const audioHostRef = useRef<HTMLDivElement | null>(null);
  const attachedElementsRef = useRef<HTMLMediaElement[]>([]);

  useEffect(() => () => {
    void connectionRef.current?.disconnect();
    for (const element of attachedElementsRef.current) element.remove();
    attachedElementsRef.current = [];
  }, []);

  function attachRemoteAudio(track: RemoteAudioTrack) {
    const element = track.attach();
    element.autoplay = true;
    element.setAttribute('data-professor-audio', 'true');
    audioHostRef.current?.appendChild(element);
    attachedElementsRef.current.push(element);
  }

  async function start() {
    if (!enabled || state === 'connecting' || state === 'listening') return;
    setState('connecting');
    setError(null);
    try {
      const contract = trackContract(track);
      const connection = await connectProfessor(
        {
          lessonId: lessonId ?? 'unpublished-golden-lesson',
          learnerId: 'authenticated-learner',
          track: contract.learnerTrack,
          mode: contract.mode,
          languageProfile: {
            preferredMix: 'uk-us-mix',
            includeIrishExposure: true,
            correctionMode: track === 'payroll' ? 'delayed' : 'minimal',
          },
        },
        {
          onRemoteAudio: attachRemoteAudio,
          onDisconnected: () => setState('ended'),
        },
      );
      connectionRef.current = connection;
      setState('listening');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Professor connection failed.');
      setState('error');
    }
  }

  async function stop() {
    const connection = connectionRef.current;
    connectionRef.current = null;
    if (connection) await connection.disconnect();
    for (const element of attachedElementsRef.current) element.remove();
    attachedElementsRef.current = [];
    setState('ended');
  }

  return (
    <div className="professor-session-panel" data-testid="professor-session-panel">
      <div className={`professor-live-orb ${state}`} aria-hidden="true"><span>AI</span></div>
      <div className="professor-live-copy">
        <span className="professor-state-label">
          {!enabled ? 'PROFESSOR LOCKED FOR SETUP' : state === 'connecting' ? 'CONNECTING' : state === 'listening' ? 'LISTENING' : state === 'ended' ? 'SESSION ENDED' : state === 'error' ? 'CONNECTION ERROR' : 'READY'}
        </span>
        <h3>{track === 'english' ? 'Natural conversation tutor' : track === 'payroll' ? 'Irish Payroll Professor' : 'Finance Professor'}</h3>
        <p>
          {track === 'english'
            ? 'British + American English with deliberate Irish exposure and real everyday conversation.'
            : track === 'payroll'
              ? 'Patient payroll coaching with progressively more professional English.'
              : 'Executive finance coaching focused on judgement, business partnering and Dublin readiness.'}
        </p>
      </div>

      <div className="professor-live-actions">
        {state !== 'listening' ? (
          <button className="primary-btn" type="button" onClick={start} disabled={!enabled || state === 'connecting'}>
            {!enabled ? 'LiveKit setup required' : state === 'connecting' ? 'Connecting…' : 'Start voice session'}
          </button>
        ) : (
          <button className="primary-btn professor-stop" type="button" onClick={stop}>End session</button>
        )}
      </div>

      {error && <div className="professor-live-error" role="alert">{error}</div>}
      <div ref={audioHostRef} className="professor-audio-host" aria-hidden="true" />
      <div className="professor-privacy-note">Raw learner voice is not stored by the Learning Hub by default.</div>
    </div>
  );
}
