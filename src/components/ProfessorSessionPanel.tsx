import { useEffect, useRef, useState } from 'react';
import { useLearnerSession } from '../auth/LearnerSession';
import { canUseLearnerActions } from '../auth/identity';
import type { RemoteAudioTrack } from 'livekit-client';
import { isFeatureEnabled } from '../config/features';
import { getLearnerProfile, type LearnerKey } from '../learners/profiles';
import { connectProfessor, type ProfessorConnection } from '../professor/livekitProfessor';
import type { LearnerTrack, TutorSessionRequest } from '../services/contracts';

type ProfessorSessionPanelProps = {
  lessonId?: string;
  track: 'finance' | 'payroll' | 'english';
  learnerKey?: LearnerKey;
};

type SessionState = 'ready' | 'connecting' | 'listening' | 'ended' | 'error';

const seededTechnicalLessonIds: Record<'finance' | 'payroll', string> = {
  finance: 'b3639582-3c32-4147-a4b3-84237d11a66e',
  payroll: '6ffda415-3b18-46ab-afaa-414f81a7eb31',
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolvedLessonId(track: ProfessorSessionPanelProps['track'], lessonId?: string): string {
  if (track === 'english') return lessonId ?? 'english-golden-lesson';
  if (lessonId && uuidPattern.test(lessonId)) return lessonId;
  return seededTechnicalLessonIds[track];
}

function trackContract(track: ProfessorSessionPanelProps['track']): { learnerTrack: LearnerTrack; mode: TutorSessionRequest['mode'] } {
  if (track === 'payroll') return { learnerTrack: 'viviane_payroll', mode: 'chapter_conversation' };
  if (track === 'english') return { learnerTrack: 'english_academy', mode: 'general_conversation' };
  return { learnerTrack: 'rafael_finance', mode: 'chapter_conversation' };
}

function professorValidationMode(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('validation') === '1';
}

export function ProfessorSessionPanel({ lessonId, track, learnerKey = track === 'payroll' ? 'viviane' : 'rafael' }: ProfessorSessionPanelProps) {
  const account = useLearnerSession();
  const accountMatches = canUseLearnerActions(account.learnerKey,learnerKey,track);
  const enabled = isFeatureEnabled('professor');
  const connectionAbortRef = useRef<AbortController | null>(null);
  const learnerProfile = getLearnerProfile(learnerKey);
  const validationMode = professorValidationMode();
  const [state, setState] = useState<SessionState>('ready');
  const [error, setError] = useState<string | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const connectionRef = useRef<ProfessorConnection | null>(null);
  const audioHostRef = useRef<HTMLDivElement | null>(null);
  const attachedElementsRef = useRef<HTMLMediaElement[]>([]);

  useEffect(() => () => {
    connectionAbortRef.current?.abort();
    void connectionRef.current?.disconnect().catch(() => undefined);
    for (const element of attachedElementsRef.current) element.remove();
    attachedElementsRef.current = [];
  }, []);

  function attachRemoteAudio(remoteTrack: RemoteAudioTrack) {
    const element = remoteTrack.attach();
    element.autoplay = true;
    element.setAttribute('data-professor-audio', 'true');
    audioHostRef.current?.appendChild(element);
    attachedElementsRef.current.push(element);
    void element.play().catch(() => setAudioBlocked(true));
  }

  async function start() {
    if (!enabled || !accountMatches || state === 'connecting' || state === 'listening') return;
    const controller = new AbortController();
    connectionAbortRef.current = controller;
    setState('connecting');
    setError(null);
    setAudioBlocked(false);
    try {
      const contract = trackContract(track);
      const connection = await connectProfessor(
        {
          lessonId: resolvedLessonId(track, lessonId),
          learnerId: learnerKey,
          track: contract.learnerTrack,
          mode: contract.mode,
          validationMode,
          languageProfile: {
            preferredMix: 'uk-us-mix',
            includeIrishExposure: true,
            correctionMode: learnerProfile.english.preferredCorrectionMode,
            professorEnglishSharePct: learnerProfile.english.professorEnglishSharePct,
            supportLanguage: learnerProfile.professor.defaultLanguage,
          },
        },
        {
          signal: controller.signal,
          expectedUserId: account.userId,
          onRemoteAudio: remote => { if (!controller.signal.aborted) attachRemoteAudio(remote); },
          onAudioPlaybackStatusChanged: canPlaybackAudio => { if (!controller.signal.aborted) setAudioBlocked(!canPlaybackAudio); },
          onDisconnected: () => { if (!controller.signal.aborted) setState('ended'); },
        },
      );
      if (controller.signal.aborted) { await connection.disconnect(); return; }
      connectionRef.current = connection;
      setAudioBlocked(!connection.room.canPlaybackAudio);
      setState('listening');
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(cause instanceof Error ? cause.message : 'Professor connection failed.');
      setState('error');
    }
  }

  async function enableAudio() {
    const room = connectionRef.current?.room;
    if (!room) return;
    try {
      await room.startAudio();
      setAudioBlocked(!room.canPlaybackAudio);
      if (room.canPlaybackAudio) setError(null);
    } catch {
      setAudioBlocked(true);
      setError('Your browser is blocking Professor audio. Tap Enable sound again or allow sound for this site.');
    }
  }

  async function stop() {
    connectionAbortRef.current?.abort();
    connectionAbortRef.current = null;
    const connection = connectionRef.current;
    connectionRef.current = null;
    if (connection) await connection.disconnect().catch(() => undefined);
    for (const element of attachedElementsRef.current) element.remove();
    attachedElementsRef.current = [];
    setAudioBlocked(false);
    setState('ended');
  }

  return (
    <div className="professor-session-panel" data-testid="professor-session-panel">
      <div className={`professor-live-orb ${state}`} aria-hidden="true"><span>AI</span></div>
      <div className="professor-live-copy">
        <span className="professor-state-label">
          {validationMode ? 'VALIDATION MODE · ' : ''}
          {!enabled ? 'PROFESSOR LOCKED FOR SETUP' : state === 'connecting' ? 'CONNECTING' : state === 'listening' ? 'LISTENING' : state === 'ended' ? 'SESSION ENDED' : state === 'error' ? 'CONNECTION ERROR' : 'READY'}
        </span>
        <h3>{track === 'english' ? `${learnerProfile.displayName}'s conversation tutor` : track === 'payroll' ? 'Irish Payroll Professor' : 'Finance Professor'}</h3>
        <p>
          {track === 'english'
            ? `British + American English with deliberate Irish exposure. Current English share target: ${learnerProfile.english.professorEnglishSharePct}%.`
            : track === 'payroll'
              ? 'Patient payroll coaching with progressively more professional English.'
              : 'Executive finance coaching focused on judgement, business partnering and Dublin readiness.'}
        </p>
      </div>

      {!accountMatches && <p role="status" data-testid="professor-account-mismatch">This is a profile preview. Return to your signed-in learner or sign out to change accounts before starting the Professor.</p>}
      {state === 'connecting' && <button type="button" className="secondary-btn" onClick={() => void stop()}>Cancel connection</button>}
      <div className="professor-live-actions">
        {state !== 'listening' ? (
          <button className="primary-btn" type="button" onClick={start} disabled={!enabled || !accountMatches || state === 'connecting'}>
            {!enabled ? 'LiveKit setup required' : state === 'connecting' ? 'Connecting…' : validationMode ? 'Start validation session' : 'Start voice session'}
          </button>
        ) : (
          <>
            {audioBlocked && (
              <button className="primary-btn professor-enable-audio" type="button" onClick={enableAudio}>🔊 Enable sound</button>
            )}
            <button className="primary-btn professor-stop" type="button" onClick={stop}>End session</button>
          </>
        )}
      </div>

      {audioBlocked && state === 'listening' && (
        <div className="professor-audio-warning" role="status">Your browser blocked voice playback. Tap <strong>Enable sound</strong> once.</div>
      )}
      {error && <div className="professor-live-error" role="alert">{error}</div>}
      {validationMode && (
        <div className="professor-privacy-note">Validation session: transcript, evaluator and cost metering stay active, but Learning Memory, Error Bank and spaced reviews are not updated.</div>
      )}
      <div ref={audioHostRef} className="professor-audio-host" aria-hidden="true" />
      {!validationMode && <div className="professor-privacy-note">Raw learner voice is not stored by the Learning Hub by default.</div>}
    </div>
  );
}
