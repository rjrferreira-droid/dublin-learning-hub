import { supabase, supabasePublishableKey, supabaseUrl } from './supabase';

export class EdgeFunctionError extends Error {
  status?: number;
  payload?: unknown;

  constructor(message: string, status?: number, payload?: unknown) {
    super(message);
    this.name = 'EdgeFunctionError';
    this.status = status;
    this.payload = payload;
  }
}

export async function invokeEdge<TResponse, TBody extends Record<string, unknown>>(
  functionName: string,
  body: TBody,
): Promise<TResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new EdgeFunctionError('Authentication required before calling AI services.', 401);
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    const message = typeof payload === 'object' && payload && 'error' in payload
      ? String((payload as { error?: unknown }).error ?? `Edge Function failed (${response.status})`)
      : `Edge Function failed (${response.status})`;
    throw new EdgeFunctionError(message, response.status, payload);
  }

  return payload as TResponse;
}
