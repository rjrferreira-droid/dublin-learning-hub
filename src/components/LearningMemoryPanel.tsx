import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadLearningMemory, type LearningMemorySession, type LearningMemorySnapshot } from '../services/learningMemory';

function scorePairs(session: LearningMemorySession) {
  return [
    ['Technical', session.technicalScore],
    ['English', session.englishScore],
    ['Grammar', session.grammarScore],
    ['Vocabulary', session.vocabularyScore],
    ['Fluency', session.fluencyScore],
    ['Pronunciation', session.pronunciationScore],
    ['Professional', session.professionalCommunicationScore],
  ].filter((pair): pair is [string, number] => typeof pair[1] === 'number');
}

function sessionAverage(session: LearningMemorySession): number | null {
  const values = scorePairs(session).map(([, value]) => value);
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function shortDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IE', { day: '2-digit', month: 'short' }).format(date);
}

function duration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs ? `${mins}m ${secs}s` : `${mins}m`;
}

function titleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function scoreClass(value: number) {
  if (value >= 75) return 'strong';
  if (value >= 65) return 'developing';
  return 'priority';
}

export function LearningMemoryPanel() {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<LearningMemorySnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await loadLearningMemory();
      setSnapshot(result);
    } catch {
      setSnapshot(null);
      setMessage('Learning Memory is temporarily unavailable. Your saved sessions remain protected.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !snapshot && !loading) void load();
  }, [open, snapshot, loading, load]);

  const latest = snapshot?.latest ?? null;
  const latestScores = latest ? scorePairs(latest) : [];
  const trajectory = useMemo(() => {
    if (!snapshot) return [];
    return [...snapshot.history]
      .reverse()
      .map((session) => ({ session, average: sessionAverage(session) }))
      .filter((item): item is { session: LearningMemorySession; average: number } => typeof item.average === 'number');
  }, [snapshot]);

  const launcherScore = latest ? sessionAverage(latest) : null;

  return (
    <div className={`learning-memory-shell ${open ? 'open' : ''}`} data-testid="learning-memory">
      {!open ? (
        <button className="learning-memory-launcher" onClick={() => setOpen(true)} aria-label="Open Learning Memory">
          <span className="learning-memory-orb">◎</span>
          <span>Learning Memory</span>
          <strong>{launcherScore == null ? 'Live' : `${Math.round(launcherScore)}%`}</strong>
        </button>
      ) : (
        <section className="learning-memory-card" aria-label="Learning Memory">
          <div className="learning-memory-head">
            <div>
              <div className="learning-memory-eyebrow">PROFESSOR • LEARNING MEMORY</div>
              <h3>What the Professor learned</h3>
              <p>Real session evidence, recurring errors and scheduled recall.</p>
            </div>
            <button className="learning-memory-close" onClick={() => setOpen(false)} aria-label="Close Learning Memory">×</button>
          </div>

          {loading ? (
            <div className="learning-memory-state">Reading your learning history…</div>
          ) : message ? (
            <div className="learning-memory-state">{message}</div>
          ) : !snapshot || !latest ? (
            <div className="learning-memory-state">Complete a Professor session to start building a measured learning profile.</div>
          ) : (
            <>
              <div className="learning-memory-latest">
                <div className="learning-memory-latest-meta">
                  <span>LATEST EVALUATION</span>
                  <strong>{shortDate(latest.completedAt ?? latest.startedAt)} • {duration(latest.durationSeconds)} • {titleCase(latest.qualityTier ?? 'premium')}</strong>
                </div>
                <h4>{latest.lessonTitle}</h4>
                <p>{latest.feedback?.summary ?? 'Session saved. Evaluation details will appear after processing.'}</p>
                {typeof latest.feedback?.assessmentConfidence === 'number' ? (
                  <div className="learning-memory-confidence">Assessment confidence: {Math.round(latest.feedback.assessmentConfidence)}%</div>
                ) : null}
              </div>

              {latestScores.length > 0 ? (
                <div className="learning-memory-score-grid">
                  {latestScores.map(([label, value]) => (
                    <div className={`learning-memory-score ${scoreClass(value)}`} key={label}>
                      <span>{label}</span>
                      <strong>{Math.round(value)}</strong>
                      <div className="learning-memory-score-track"><i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="learning-memory-columns">
                <div className="learning-memory-block">
                  <div className="learning-memory-block-head"><span>Strengths</span><small>latest session</small></div>
                  {(latest.feedback?.strengths ?? []).slice(0, 3).map((item) => <p className="memory-positive" key={item}>+ {item}</p>)}
                  {(latest.feedback?.strengths ?? []).length === 0 ? <p className="memory-muted">More evidence needed.</p> : null}
                </div>
                <div className="learning-memory-block">
                  <div className="learning-memory-block-head"><span>Next focus</span><small>adaptive</small></div>
                  {(latest.feedback?.nextSessionFocus ?? latest.feedback?.improvements ?? []).slice(0, 3).map((item) => <p key={item}>→ {item}</p>)}
                  {(latest.feedback?.nextSessionFocus ?? latest.feedback?.improvements ?? []).length === 0 ? <p className="memory-muted">No priority recorded yet.</p> : null}
                </div>
              </div>

              <div className="learning-memory-section-head">
                <div><span>COMPETENCY PROFILE</span><strong>{snapshot.competencies.length} measured</strong></div>
                <small>scores update as evidence accumulates</small>
              </div>
              <div className="learning-memory-competencies">
                {snapshot.competencies.slice(0, 6).map((item) => (
                  <div className="memory-competency-row" key={item.code}>
                    <div><span>{item.name}</span><small>{item.evidenceCount} evidence • {Math.round(item.confidence)}% confidence</small></div>
                    <strong>{Math.round(item.score)}%</strong>
                    <div className="memory-competency-track"><i style={{ width: `${item.score}%` }} /></div>
                  </div>
                ))}
                {snapshot.competencies.length === 0 ? <p className="memory-muted">Competency scoring begins after evaluated sessions.</p> : null}
              </div>

              <div className="learning-memory-columns compact">
                <div className="learning-memory-block">
                  <div className="learning-memory-block-head"><span>Error Bank</span><small>{snapshot.errors.length} active</small></div>
                  {snapshot.errors.slice(0, 3).map((item) => (
                    <div className="memory-error-row" key={item.id}>
                      <span>{titleCase(item.domain)}</span>
                      <p>{item.pattern}</p>
                      <small>review {shortDate(item.nextReviewAt)} • confidence {Math.round(item.confidence)}%</small>
                    </div>
                  ))}
                  {snapshot.errors.length === 0 ? <p className="memory-muted">No active recurring errors.</p> : null}
                </div>
                <div className="learning-memory-block">
                  <div className="learning-memory-block-head"><span>Spaced review</span><small>{snapshot.reviews.length} scheduled</small></div>
                  {snapshot.reviews.slice(0, 4).map((item) => (
                    <div className="memory-review-row" key={item.id}>
                      <strong>{item.stage}</strong>
                      <div><span>{item.label}</span><small>{shortDate(item.dueDate)} • {item.status}</small></div>
                    </div>
                  ))}
                  {snapshot.reviews.length === 0 ? <p className="memory-muted">No reviews scheduled.</p> : null}
                </div>
              </div>

              <div className="learning-memory-section-head trajectory-head">
                <div><span>TRAJECTORY</span><strong>{trajectory.length} evaluated session{trajectory.length === 1 ? '' : 's'}</strong></div>
                <small>average of scored dimensions</small>
              </div>
              {trajectory.length > 0 ? (
                <div className="memory-trajectory" aria-label="Learning score trajectory">
                  {trajectory.map(({ session, average }) => (
                    <div className="memory-trajectory-point" key={session.id} title={`${shortDate(session.completedAt ?? session.startedAt)}: ${Math.round(average)}%`}>
                      <span style={{ height: `${Math.max(12, Math.min(100, average))}%` }} />
                      <small>{shortDate(session.completedAt ?? session.startedAt)}</small>
                    </div>
                  ))}
                </div>
              ) : null}
              {trajectory.length === 1 ? <p className="memory-trajectory-note">Your measured trajectory starts here. The next evaluated session will create the first real comparison.</p> : null}

              <div className="learning-memory-foot">
                <span>Only authenticated learner data is shown.</span>
                <button onClick={() => void load()} disabled={loading}>Refresh</button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
