import { createHash, randomBytes, randomUUID } from 'node:crypto';

type RpcClient = { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: any; error: { message: string } | null }> };
export class ProfessorStartupError extends Error {
  status: number;
  constructor(code: string, status: number) { super(code); this.name = 'ProfessorStartupError'; this.status = status; }
}
export async function startProfessorAtomically(db: RpcClient, input: { lessonId: string; mode: string; roomName: string; validationMode: boolean }) {
  const callbackToken = randomBytes(32).toString('hex');
  const { data: row, error } = await db.rpc('start_professor_session_atomic', {
    p_request_id: randomUUID(), p_lesson_id: input.lessonId, p_mode: input.mode,
    p_room_name: input.roomName, p_callback_hash: createHash('sha256').update(callbackToken).digest('hex'), p_validation_mode: input.validationMode,
  });
  if (error) {
    const safe = new Set(['authentication_required','professor_track_forbidden','professor_lesson_forbidden','invalid_professor_request','startup_request_conflict']);
    throw new ProfessorStartupError(safe.has(error.message) ? error.message : 'professor_budget_guard_unavailable', safe.has(error.message) ? 403 : 503);
  }
  if (!row || row.allowed !== true) {
    const reason = row?.reason;
    const conflict = ['request_already_started','professor_session_already_active'].includes(reason);
    const limit = ['professor_monthly_budget_reached','professor_start_rate_limited'].includes(reason);
    throw new ProfessorStartupError(conflict || limit ? reason : 'professor_budget_guard_unavailable', conflict ? 409 : limit ? 429 : 503);
  }
  if (typeof row.session_id !== 'string' || typeof row.reservation_id !== 'string' || typeof row.room_name !== 'string' || row.quality_tier !== 'premium') throw new ProfessorStartupError('professor_session_persistence_unavailable',503);
  const number = (key: string) => {
    const v = Number(row[key]);
    if (row[key] == null || !Number.isFinite(v) || v < 0) throw new ProfessorStartupError('professor_budget_guard_unavailable',503);
    return v;
  };
  const duration = number('max_session_seconds');
  if (duration < 60 || duration > 1200) throw new ProfessorStartupError('professor_budget_guard_unavailable',503);
  return {
    roomName: row.room_name as string, validationMode: row.validation_mode === true,
    persistence: { sessionId: row.session_id as string, callbackToken },
    budget: { allowed:true, reservationId:row.reservation_id as string,qualityTier:'premium' as const,maxSessionSeconds:duration,
      monthlyBudgetUsd:number('monthly_budget_usd'),globalAiCapUsd:number('global_ai_cap_usd'),reservationUsd:number('reservation_usd'),
      reservedBeforeUsd:number('reserved_before_usd'),reservedAfterUsd:number('reserved_after_usd'),globalCommittedBeforeUsd:number('global_committed_before_usd') },
  };
}
