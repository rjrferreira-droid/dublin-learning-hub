import { useState } from 'react';
import { isFeatureEnabled } from '../config/features';
import { normalizePremiumAudioError, premiumAudioService, type PremiumAudioError, type PremiumAudioResult } from '../services/premiumAudio';

type PremiumAudioPanelProps = {
  lessonId?: string;
  lessonTitle: string;
};

type AudioState = PremiumAudioResult | null;

export function PremiumAudioPanel({ lessonId, lessonTitle }: PremiumAudioPanelProps) {
  const [audio, setAudio] = useState<AudioState>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PremiumAudioError | null>(null);

  const enabled = isFeatureEnabled('premiumAudio');
  const available = enabled && Boolean(lessonId);

  async function loadAudio() {
    if (!lessonId || loading) return;
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
    <div className="reading-copy" data-testid="premium-audio-panel">
      <h2>Premium Audio</h2>
      <p className="lead">
        A professor-style narration of this lesson, generated once and cached for future listening.
      </p>

      {!enabled ? (
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
          <button
            className="audio-play"
            type="button"
            aria-label={audio ? 'Reload Premium Audio' : 'Load Premium Audio'}
            onClick={loadAudio}
            disabled={loading}
          >
            {loading ? '…' : audio ? '↻' : '▶'}
          </button>

          <div className="premium-audio-copy">
            <strong>{lessonTitle}</strong>
            <span>
              {loading
                ? 'Preparing premium narration…'
                : audio
                  ? audio.cached
                    ? 'Loaded from secure lesson cache'
                    : 'New premium narration generated'
                  : 'Ready to load on demand'}
            </span>
          </div>

          <div className="audio-wave" aria-hidden="true">▁▃▅▂▆▃▇▅▂▆▃▅▁</div>

          {!audio && (
            <button className="secondary-dark-btn" type="button" onClick={loadAudio} disabled={!available || loading}>
              {loading ? 'Loading…' : 'Load audio'}
            </button>
          )}
        </div>
      )}

      {audio && (
        <div className="premium-audio-player">
          <audio controls preload="metadata" src={audio.audioUrl}>
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
          <strong>{error.code === 'budget-reached' ? 'Generation budget reached' : error.retryable ? 'Audio temporarily unavailable' : 'Audio unavailable'}</strong>
          <span>{error.message}</span>
          {error.retryable && <button className="secondary-btn" type="button" onClick={loadAudio}>Try again</button>}
        </div>
      )}

      <div className="callout">
        <strong>Cost-safe and isolated by design</strong>
        <span>Concurrent requests for the same lesson are deduplicated. Cached audio bypasses new generation, and audio failure never changes the active lesson, tab or learner progress.</span>
      </div>
    </div>
  );
}
