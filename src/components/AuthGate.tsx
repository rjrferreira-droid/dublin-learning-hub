import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

type LearnerKey = 'rafael' | 'viviane';
type LearnerTrack = 'rafael_finance' | 'viviane_payroll';

type ProfileRow = {
  display_name: string;
  learner_track: LearnerTrack;
};

type AuthGateProps = {
  children: ReactNode;
};

const learnerCopy: Record<LearnerKey, { name: string; track: LearnerTrack; subtitle: string }> = {
  rafael: {
    name: 'Rafael',
    track: 'rafael_finance',
    subtitle: 'Finance Ireland • ACCA • English Academy',
  },
  viviane: {
    name: 'Viviane',
    track: 'viviane_payroll',
    subtitle: 'Irish Payroll • Revenue • English Academy',
  },
};

function learnerFromTrack(track: LearnerTrack): LearnerKey {
  return track === 'viviane_payroll' ? 'viviane' : 'rafael';
}

async function readOrCreateProfile(user: User): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, learner_track')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;
  if (data) return data as ProfileRow;

  const metadataTrack = user.user_metadata?.learner_track;
  if (metadataTrack !== 'rafael_finance' && metadataTrack !== 'viviane_payroll') return null;

  const learner = metadataTrack === 'viviane_payroll' ? learnerCopy.viviane : learnerCopy.rafael;
  const displayName = typeof user.user_metadata?.display_name === 'string' && user.user_metadata.display_name.trim()
    ? user.user_metadata.display_name.trim()
    : learner.name;

  const { data: inserted, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      display_name: displayName,
      learner_track: metadataTrack,
    })
    .select('display_name, learner_track')
    .single();

  if (insertError) throw insertError;
  return inserted as ProfileRow;
}

export function AuthGate({ children }: AuthGateProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [learnerKey, setLearnerKey] = useState<LearnerKey>('rafael');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setErrorMessage(error.message);
      setSession(data.session);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      if (!nextSession) setProfile(null);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    setProfileLoading(true);
    setErrorMessage(null);

    void readOrCreateProfile(session.user)
      .then((row) => {
        if (!cancelled) setProfile(row);
      })
      .catch((error: unknown) => {
        if (!cancelled) setErrorMessage(error instanceof Error ? error.message : 'Unable to load your Learning Hub profile.');
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const activeLearner = useMemo(() => profile ? learnerFromTrack(profile.learner_track) : learnerKey, [profile, learnerKey]);

  useEffect(() => {
    if (!profile) return;
    const timer = window.setTimeout(() => {
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.learner-switch button'));
      const desired = activeLearner === 'viviane' ? buttons[1] : buttons[0];
      if (desired && !desired.classList.contains('active')) desired.click();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [profile, activeLearner]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const learner = learnerCopy[learnerKey];
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              learner_track: learner.track,
              display_name: learner.name,
            },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setMessage('Conta criada. Verifique seu e-mail para confirmar o acesso e depois volte para entrar.');
        }
      }
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível concluir o acesso.');
    } finally {
      setSubmitting(false);
    }
  }

  async function createMissingProfile(key: LearnerKey) {
    if (!session?.user) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const learner = learnerCopy[key];
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: session.user.id,
          display_name: learner.name,
          learner_track: learner.track,
        })
        .select('display_name, learner_track')
        .single();
      if (error) throw error;
      setProfile(data as ProfileRow);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível criar o perfil.');
    } finally {
      setSubmitting(false);
    }
  }

  async function logout() {
    setErrorMessage(null);
    const { error } = await supabase.auth.signOut();
    if (error) setErrorMessage(error.message);
  }

  if (loading) {
    return (
      <div className="auth-screen auth-loading-screen">
        <div className="auth-loading-card">
          <div className="auth-brand-mark">LH</div>
          <strong>Learning Hub</strong>
          <span>Preparing your secure learning workspace…</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="auth-screen">
        <section className="auth-hero">
          <div className="auth-brand-row">
            <div className="auth-brand-mark">LH</div>
            <div>
              <strong>Learning Hub</strong>
              <span>PREMIUM LEARNING</span>
            </div>
          </div>
          <div className="auth-hero-copy">
            <div className="auth-kicker">DUBLIN 2028/29 • PRIVATE LEARNING SYSTEM</div>
            <h1>One secure place for technical mastery, English and adaptive practice.</h1>
            <p>Your learning history, Error Bank, Professor sessions and cost controls stay attached to your own account.</p>
          </div>
          <div className="auth-feature-grid">
            <div><span>01</span><strong>Adaptive curriculum</strong><small>Prioritised by real learning need.</small></div>
            <div><span>02</span><strong>Professor</strong><small>Grounded, voice-first coaching.</small></div>
            <div><span>03</span><strong>Protected budget</strong><small>Monthly AI guardrails built in.</small></div>
          </div>
        </section>

        <section className="auth-panel">
          <div className="auth-card">
            <div className="auth-card-head">
              <span>{mode === 'signin' ? 'WELCOME BACK' : 'FIRST ACCESS'}</span>
              <h2>{mode === 'signin' ? 'Enter Learning Hub' : 'Create your secure account'}</h2>
              <p>{mode === 'signin' ? 'Use the account you created for this Learning Hub.' : 'Choose who is creating the account, then set an email and password.'}</p>
            </div>

            {mode === 'signup' ? (
              <div className="auth-learner-picker" aria-label="Choose learner profile">
                {(Object.keys(learnerCopy) as LearnerKey[]).map((key) => (
                  <button key={key} type="button" className={learnerKey === key ? 'selected' : ''} onClick={() => setLearnerKey(key)}>
                    <strong>{learnerCopy[key].name}</strong>
                    <span>{learnerCopy[key].subtitle}</span>
                  </button>
                ))}
              </div>
            ) : null}

            <form className="auth-form" onSubmit={submitAuth}>
              <label>
                <span>E-mail</span>
                <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="seu@email.com" />
              </label>
              <label>
                <span>Senha</span>
                <input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required placeholder="Mínimo de 8 caracteres" />
              </label>

              {errorMessage ? <div className="auth-message error">{errorMessage}</div> : null}
              {message ? <div className="auth-message success">{message}</div> : null}

              <button className="auth-submit" type="submit" disabled={submitting}>
                {submitting ? 'Aguarde…' : mode === 'signin' ? 'Entrar' : 'Criar conta'}
              </button>
            </form>

            <button className="auth-mode-switch" type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setErrorMessage(null); setMessage(null); }}>
              {mode === 'signin' ? 'Primeiro acesso? Criar conta' : 'Já tenho conta • Entrar'}
            </button>

            <div className="auth-security-note">Secure session • Supabase Auth • V2 isolated environment</div>
          </div>
        </section>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="auth-screen auth-loading-screen">
        <div className="auth-loading-card">
          <div className="auth-brand-mark">LH</div>
          <strong>Loading your profile</strong>
          <span>Connecting your secure learning history…</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="auth-screen auth-loading-screen">
        <div className="auth-profile-setup">
          <div className="auth-brand-mark">LH</div>
          <span className="auth-kicker">PROFILE SETUP</span>
          <h2>Who is using this account?</h2>
          <p>This choice links the account to the correct private learning track.</p>
          <div className="auth-learner-picker setup">
            {(Object.keys(learnerCopy) as LearnerKey[]).map((key) => (
              <button key={key} type="button" onClick={() => void createMissingProfile(key)} disabled={submitting}>
                <strong>{learnerCopy[key].name}</strong>
                <span>{learnerCopy[key].subtitle}</span>
              </button>
            ))}
          </div>
          {errorMessage ? <div className="auth-message error">{errorMessage}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className={`auth-app learner-${activeLearner}`}>
      {children}
      <button className="auth-signout" type="button" onClick={() => void logout()} title="Sign out of Learning Hub">Sair</button>
    </div>
  );
}
