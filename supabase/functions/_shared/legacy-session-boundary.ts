/** Pure boundary: the legacy browser tutor must never mutate the managed Professor ledger. */
export function legacySessionBlockReason(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'session_unavailable';
  const row = value as Record<string, unknown>;
  if (['budget_reservation_id', 'callback_token_hash', 'startup_request_id', 'room_name'].some(key => row[key] !== null && row[key] !== undefined)) return 'managed_professor_session';
  if (row.status !== 'active') return 'session_already_finalized';
  return null;
}
