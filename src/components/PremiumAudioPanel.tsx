import { useState } from 'react';
import { isFeatureEnabled } from '../config/features';
import { premiumAudioService } from '../services/premiumAudio';

type PremiumAudioPanelProps = {
  lessonId?: string;
  lessonTitle: string;
};

type AudioState = {
  url: string;
  cached: boolean;
  estimatedCostUsd?: number;
} | null;

export function PremiumAudioPanel({ lessonId, lessonTitle }: PremiumAudioPanelProps) {
  const [audio, setAudio] = useState<AudioState>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enabled = isFeatureEnabled('premiumAudio');
  const available = enabled && Boolean(lessonId);

  async function loadAudio() {
    if (!lessonId || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await premiumAudioService.getOrCreateLessonAudio(lessonId);
      setAudio({
        url: result.audioUrl,
        cached: result.cached,
        estimatedCostUsd: result.estimatedCostUsd,
      });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Premium Audio could not be loaded.';
      setError(message);
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
          <audio controls preload="metadata" src={audio.url}>
            Your browser does not support audio playback.
          </audio>
          <div className="premium-audio-meta">
            <span>{audio.cached ? 'Cached asset' : 'New asset'}</span>
            {audio.estimatedCostUsd != null && !audio.cached && (
              <span>Estimated generation cost: US${audio.estimatedCostUsd.toFixed(4)}</span>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="audio-error" role="alert">
          <strong>Audio unavailable</strong>
          <span>{error}</span>
          <button className="secondary-btn" type="button" onClick={loadAudio}>Try again</button>
        </div>
      )}

      <div className="callout">
        <strong>Isolated by design</strong>
        <span>Audio loading, failure or retry never changes the active lesson, tab or learner progress.</span>
      </div>
    </div>
  );
}
