import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

type CostCenterPayload = {
  status: 'safe' | 'watch' | 'guarded';
  month: string;
  budget: {
    absoluteTotalUsd: number;
    infrastructureReserveUsd: number;
    aiHardCapUsd: number;
    professorCapUsd: number;
    premiumAudioCapUsd: number;
  };
  usage: {
    actualAiSpendUsd?: number;
    loggedAiUsd?: number;
    professorReservedUsd: number;
    professorActiveReservedUsd?: number;
    professorUnresolvedReservedUsd?: number;
    professorActualUsd?: number;
    professorCommittedUsd?: number;
    professorEvaluationUsd?: number;
    premiumAudioOnlyUsd?: number;
    premiumAudioUsd: number;
    aiCommittedUsd: number;
    totalCommittedWithReserveUsd: number;
    aiRemainingUsd: number;
    safetyBufferUsd: number;
  };
  utilizationPct: {
    total: number;
    ai: number;
    professor: number;
    premiumAudio: number;
  };
  professorSessions: number;
  professorCompletedSessions?: number;
  professorActiveReservations?: number;
  professorUnresolvedReservations?: number;
  generatedAt: string;
};

function money(value: number) {
  return `$${Math.max(0, value).toFixed(value < 10 ? 2 : 0)}`;
}

function statusLabel(status: CostCenterPayload['status']) {
  if (status === 'guarded') return 'Guarded';
  if (status === 'watch') return 'Watch';
  return 'Safe';
}

export function CostCenterPanel() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<CostCenterPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setData(null);
        setMessage('Cost controls are ready. Sign in to view live usage.');
        return;
      }

      const { data: payload, error } = await supabase.functions.invoke('learning-hub-cost-center', {
        method: 'POST',
      });
      if (error || !payload) throw error ?? new Error('Cost Center unavailable');
      setData(payload as CostCenterPayload);
    } catch {
      setData(null);
      setMessage('Live cost data is temporarily unavailable. AI guards remain fail-closed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !data && !loading) void load();
  }, [open, data, loading, load]);

  const totalPct = Math.min(100, data?.utilizationPct.total ?? 0);
  const actualAiSpend = data?.usage.actualAiSpendUsd ?? data?.usage.loggedAiUsd ?? 0;
  const professorActual = data?.usage.professorActualUsd ?? 0;
  const liveReserveUsd = data?.usage.professorActiveReservedUsd ?? 0;
  const unresolvedReserveUsd = data?.usage.professorUnresolvedReservedUsd ?? 0;
  const liveReservations = data?.professorActiveReservations ?? 0;
  const unresolvedReservations = data?.professorUnresolvedReservations ?? 0;
  const completedSessions = data?.professorCompletedSessions ?? data?.professorSessions ?? 0;

  return (
    <div className={`cost-center-shell ${open ? 'open' : ''}`} data-testid="cost-center">
      {!open ? (
        <button className="cost-center-launcher" onClick={() => setOpen(true)} aria-label="Open Learning Hub Cost Center">
          <span className="cost-center-dot" />
          <span>Budget</span>
          <strong>{data ? `AI ${money(actualAiSpend)}` : '$200 cap'}</strong>
        </button>
      ) : (
        <section className="cost-center-card" aria-label="Learning Hub Cost Center">
          <div className="cost-center-head">
            <div>
              <div className="cost-center-eyebrow">LEARNING HUB • COST CENTER</div>
              <h3>{data ? `Actual AI spend ${money(actualAiSpend)}` : 'Monthly guardrail'}</h3>
            </div>
            <button className="cost-center-close" onClick={() => setOpen(false)} aria-label="Close Cost Center">×</button>
          </div>

          {loading ? (
            <div className="cost-center-state">Reading live budget…</div>
          ) : message ? (
            <div className="cost-center-state">{message}</div>
          ) : data ? (
            <>
              <div className="cost-center-status-row">
                <span className={`cost-center-status ${data.status}`}>{statusLabel(data.status)}</span>
                <span>Protected commitment {money(data.usage.totalCommittedWithReserveUsd)} / {money(data.budget.absoluteTotalUsd)}</span>
              </div>

              <div className="cost-center-progress" aria-label={`${data.utilizationPct.total}% of monthly ceiling protected or spent`}>
                <span style={{ width: `${totalPct}%` }} />
              </div>

              <div className="cost-center-grid">
                <div>
                  <span>Infrastructure reserve</span>
                  <strong>{money(data.budget.infrastructureReserveUsd)}</strong>
                </div>
                <div>
                  <span>Actual AI spend</span>
                  <strong>{money(actualAiSpend)} / {money(data.budget.aiHardCapUsd)}</strong>
                </div>
                <div>
                  <span>Professor voice • actual</span>
                  <strong>{money(professorActual)} / {money(data.budget.professorCapUsd)}</strong>
                </div>
                <div>
                  <span>Evaluation & Audio • actual</span>
                  <strong>{money(data.usage.premiumAudioUsd)} / {money(data.budget.premiumAudioCapUsd)}</strong>
                </div>
                <div>
                  <span>Live session reserve</span>
                  <strong>{money(liveReserveUsd)}</strong>
                </div>
                <div>
                  <span>Legacy unresolved reserve</span>
                  <strong>{money(unresolvedReserveUsd)}</strong>
                </div>
              </div>

              <div className="cost-center-buffer">
                <span>Safety buffer after protected commitments</span>
                <strong>{money(data.usage.safetyBufferUsd)}</strong>
              </div>

              <div className="cost-center-foot">
                <span>
                  {completedSessions} measured session{completedSessions === 1 ? '' : 's'} • {liveReservations} live reserve{liveReservations === 1 ? '' : 's'}
                  {unresolvedReservations > 0 ? ` • ${unresolvedReservations} legacy unresolved` : ''}
                </span>
                <button onClick={() => void load()} disabled={loading}>Refresh</button>
              </div>
            </>
          ) : null}
        </section>
      )}
    </div>
  );
}
