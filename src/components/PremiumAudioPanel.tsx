import { useEffect, useRef, useState } from 'react';
import { isFeatureEnabled } from '../config/features';
import {invokeEdge} from '../services/edge';
import { normalizePremiumAudioError, premiumAudioService, type PremiumAudioError, type PremiumAudioResult } from '../services/premiumAudio';

type PremiumAudioPanelProps = {
  lessonId?: string;
  lessonTitle: string;
  reviewedVoicesPending?: boolean;
  onPlaybackComplete?: () => void;
};

type AudioState = PremiumAudioResult | null;

export function PremiumAudioPanel({ lessonId, lessonTitle, reviewedVoicesPending = false, onPlaybackComplete }: PremiumAudioPanelProps) {
  const [audio, setAudio] = useState<AudioState>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PremiumAudioError | null>(null);
  const [connection, setConnection] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [preparationProgress, setPreparationProgress] = useState<string | null>(null);
  const [preparationError, setPreparationError] = useState<string | null>(null);
  const preparationRunning = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  // Operator-only Preview control. Each request can pay for at most one cue;
  // a fresh click reads the server's durable plan and resumes after a stop.
  async function prepareReviewedEpisode() {
    if (!lessonId || preparationRunning.current) return;
    preparationRunning.current = true;
    setPreparing(true); setPreparationError(null);
    try {
      type Plan = { status: 'plan'; total: number; next_cue_index: number | null };
      type Step = { status: 'cue_complete'; cue_index: number; total: number; next_cue_index: number | null; cached: boolean };
      const plan = await invokeEdge<Plan, { lesson_id: string; action: string }>('premium-lesson-audio',
        { lesson_id: lessonId, action: 'review_english_episode_plan' });
      if (plan.status !== 'plan' || !Number.isSafeInteger(plan.total) || plan.total < 1 || plan.total > 64)
        throw new Error('The episode plan could not be verified.');
      let next = plan.next_cue_index;
      let completed = 0;
      while (next !== null) {
        if (!mounted.current) return;
        if (!Number.isSafeInteger(next) || next < 0 || next > 128 || completed >= plan.total)
          throw new Error('The episode cue sequence changed.');
        setPreparationProgress(`Preparing voice cue ${completed + 1} of ${plan.total}…`);
        const step = await invokeEdge<Step, { lesson_id: string; action: string; cue_index: number }>('premium-lesson-audio',
          { lesson_id: lessonId, action: 'generate_reviewed_english_cue', cue_index: next });
        if (step.status !== 'cue_complete' || step.cue_index !== next || step.total !== plan.total
          || (step.next_cue_index !== null && (!Number.isSafeInteger(step.next_cue_index) || step.next_cue_index <= next)))
          throw new Error('The cue receipt could not be verified.');
        next = step.next_cue_index;
        completed += 1;
      }
      if (!mounted.current) return;
      setPreparationProgress('Joining the voices and pauses…');
      const result = await invokeEdge<{status:'finalized';audio_url:string;cached?:boolean;estimated_cost_usd?:number;expires_at?:number}, { lesson_id: string; action: string }>('premium-lesson-audio',
        { lesson_id: lessonId, action: 'finalize_reviewed_english_episode' });
      if (!result.audio_url || result.status !== 'finalized') throw new Error('The final audio receipt could not be verified.');
      if (mounted.current) {
        setAudio({audioUrl: result.audio_url, cached: Boolean(result.cached), estimatedCostUsd: result.estimated_cost_usd,
          expiresAt: result.expires_at});
        setPreparationProgress('Reviewed episode ready. Play it below to check every voice and pause.');
      }
    } catch (cause) {
      if (mounted.current) setPreparationError(cause instanceof Error ? cause.message : 'Preparation stopped. Check the last cue before resuming.');
    } finally {
      preparationRunning.current = false;
      if (mounted.current) setPreparing(false);
    }
  }

  async function checkConnection(){
    if(checking)return;
    setChecking(true);setConnection(null);
    try{
      const result=await invokeEdge<{configured:boolean;modelAccess:boolean;generationEnabled:boolean;providerStatus:number|null;organization?:string|null;project?:string|null;providerErrorCode?:string|null;credentialFormat?:string},{action:string}>('premium-lesson-audio',{action:'check_provider'});
      const status=!result.configured?'The audio provider key is missing.':result.modelAccess?'The configured key can access the speech model. This does not verify generation quota or playback.':`The audio provider did not confirm model access (HTTP ${result.providerStatus??'unavailable'}).`;
      const formatHints:Record<string,string>={masked_value:'The saved value contains masking characters. Paste the complete secret key.',assignment_included:'The saved value includes the variable name. Paste only the secret key.',bearer_included:'The saved value includes Bearer. Paste only the secret key.',quotes_included:'The saved value includes quotation marks. Paste only the secret key.',whitespace_present:'The saved value includes whitespace. Check the copied key.',unexpected_format:'The saved value does not have the expected secret-key format.'};
      setConnection([status,formatHints[result.credentialFormat??'']??'',result.providerErrorCode?`Provider code: ${result.providerErrorCode}.`:'',result.organization?`Organization: ${result.organization}.`:'',result.project?`Project: ${result.project}.`:'',result.generationEnabled?'':'Premium generation remains paused.','No audio was generated.'].filter(Boolean).join(' '));
    }catch{setConnection('The connection check could not complete. No audio was requested.');}
    finally{setChecking(false);}
  }

  const enabled = isFeatureEnabled('premiumAudio');
  const available = enabled && Boolean(lessonId);
  const runtimeClosed = error?.code === 'runtime-closed';

  async function loadAudio() {
    if (!lessonId || loading || runtimeClosed) return;
    setLoading(true);
    setError(null);
    try {
      const result = await premiumAudioService.getOrCreateLessonAudio(lessonId);
      setAudio(result);
    } catch (cause) {
      setError(normalizePremiumAudioError(cause));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="reading-copy audio-lesson-player" data-testid="premium-audio-panel">
      {new URLSearchParams(window.location.search).get('previewCheck')==='1'&&<div className="callout">
        <button className="secondary-btn" type="button" onClick={()=>void checkConnection()} disabled={checking}>{checking?'Checking audio connection…':'Check audio connection'}</button>
        {connection&&<p role="status" data-testid="audio-provider-connection">{connection}</p>}
      </div>}

      {reviewedVoicesPending ? (
        <div className="audio-demo premium-audio-live" role="status"><span className="audio-play audio-play-icon" aria-hidden="true">♫</span><div className="premium-audio-copy"><strong>{lessonTitle}</strong><span>Audio being rebuilt with character voices and real pauses.</span></div></div>
      ) : !enabled ? (
        <div className="callout">
          <strong>Audio temporarily disabled</strong>
          <span>The feature can be switched off independently without affecting the lesson.</span>
        </div>
      ) : !lessonId ? (
        <div className="callout">
          <strong>Audio source being prepared</strong>
          <span>{lessonTitle} does not yet have a published lesson record. The rest of the lesson remains fully available.</span>
        </div>
      ) : (
        <div className="audio-demo premium-audio-live">
          <span className="audio-play audio-play-icon" aria-hidden="true">♫</span>

          <div className="premium-audio-copy">
            <strong>{lessonTitle}</strong>
            <span>
              {loading
                ? 'Preparing your audio…'
                : runtimeClosed
                  ? 'Audio is being prepared'
                : audio
                  ? 'Ready to listen'
                  : 'Ready to load on demand'}
            </span>
          </div>

          <div className="audio-wave" aria-hidden="true">▁▃▅▂▆▃▇▅▂▆▃▅▁</div>

          {!audio && (
            <button className="secondary-dark-btn" type="button" onClick={loadAudio} disabled={!available || loading || runtimeClosed}>
              {loading ? 'Loading…' : runtimeClosed ? 'Not activated yet' : 'Load audio'}
            </button>
          )}
        </div>
      )}

      {reviewedVoicesPending && lessonId && new URLSearchParams(window.location.search).get('previewCheck') === '1' && (
        <div className="callout" data-testid="english-episode-operator">
          <strong>Preview audio review</strong>
          <span>Each step prepares one character cue. If preparation stops, the next click reads the saved progress.</span>
          <button className="secondary-btn" type="button" onClick={() => void prepareReviewedEpisode()} disabled={preparing}>
            {preparing ? 'Preparing reviewed episode…' : 'Prepare or resume reviewed episode'}
          </button>
          {preparationProgress && <p role="status">{preparationProgress}</p>}
          {preparationError && <p role="alert">{preparationError}</p>}
        </div>
      )}

      {audio && (
        <div className="premium-audio-player">
          <audio controls preload="metadata" src={audio.audioUrl} onEnded={onPlaybackComplete}>
            Your browser does not support audio playback.
          </audio>
          <div className="premium-audio-meta">
            <span>{audio.cached ? 'Cached asset • no new generation' : 'New asset • stored for future playback'}</span>
            {audio.estimatedCostUsd != null && !audio.cached && (
              <span>Estimated generation cost: US${audio.estimatedCostUsd.toFixed(4)}</span>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className={`audio-error ${error.retryable ? 'retryable' : 'blocked'}`} role="alert" aria-live="polite">
          <strong>{runtimeClosed ? 'Audio awaiting activation' : error.code === 'budget-reached' ? 'Generation budget reached' : error.retryable ? 'Audio temporarily unavailable' : 'Audio unavailable'}</strong>
          <span>{error.message}</span>
          {error.retryable && <button className="secondary-btn" type="button" onClick={loadAudio}>Try again</button>}
        </div>
      )}

    </div>
  );
}
