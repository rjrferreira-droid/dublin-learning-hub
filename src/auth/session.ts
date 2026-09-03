import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

export type SessionState = {
  session: Session | null;
  user: User | null;
};

export type SessionListener = (state: SessionState, event: AuthChangeEvent | 'INITIAL_SESSION') => void;

export async function readSession(): Promise<SessionState> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return { session: data.session, user: data.session?.user ?? null };
}

export async function signInWithPassword(email: string, password: string): Promise<SessionState> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { session: data.session, user: data.user };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Auth is an identity signal only. It must never decide application routing.
 * This explicitly prevents the V1 regression where TOKEN_REFRESHED / SIGNED_IN
 * events navigated an active lesson back to Dashboard.
 */
export function subscribeToSession(listener: SessionListener): () => void {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    listener({ session, user: session?.user ?? null }, event);
  });
  return () => data.subscription.unsubscribe();
}

export function eventMayChangeAuthScreen(event: AuthChangeEvent): boolean {
  return event === 'SIGNED_OUT' || event === 'PASSWORD_RECOVERY' || event === 'USER_DELETED';
}

export function eventMustNotChangeLearningRoute(event: AuthChangeEvent): boolean {
  return event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'USER_UPDATED';
}
