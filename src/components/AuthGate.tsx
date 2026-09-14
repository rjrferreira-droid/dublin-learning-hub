import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { LearnerSessionContext } from '../auth/LearnerSession';
import { learnerKeyFromTrack } from '../auth/identity';

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

async function readAssignedProfile(user: User): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, learner_track')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;
  if (data) {
    if (!learnerKeyFromTrack(data.learner_track)) throw new Error('Unsupported learner profile.');
    return data as ProfileRow;
  }

  // Authorization comes only from a service-assigned profile, never editable Auth metadata.
  return null;
}

export function AuthGate({ children }: AuthGateProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [profileFailed, setProfileFailed] = useState(false);
  const [profileAttempt, setProfileAttempt] = useState(0);
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
    let authRevision = 0;
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      authRevision++;
      setSession(nextSession);
      setLoading(false);
      if (!nextSession) { setProfile(null); setProfileUserId(null); }
    });
    const revision = authRevision;
    void supabase.auth.getSession().then(({data,error}) => {
      if (!mounted || revision !== authRevision) return;
      if (error) setErrorMessage(error.message);
      setSession(data.session);
      setLoading(false);
    }).catch(() => {
      if (mounted && revision === authRevision) { setSession(null); setLoading(false); }
    });
    return () => { mounted=false; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    let cancelled=false;
    const user=session.user;
    setProfileLoading(true);
    setProfileFailed(false);
    setErrorMessage(null);
    void readAssignedProfile(user).then(row => {
      if (!cancelled) { setProfile(row); setProfileUserId(user.id); }
    }).catch(() => {
      if (!cancelled) { setProfile(null); setProfileUserId(user.id); setProfileFailed(true); }
    }).finally(() => { if (!cancelled) setProfileLoading(false); });
    return () => { cancelled=true; };
  }, [session?.user?.id,profileAttempt]);

  const activeLearner = useMemo(() => profile ? learnerFromTrack(profile.learner_track) : learnerKey, [profile, learnerKey]);

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
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
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

  async function logout() {
    setErrorMessage(null);
    // Leave sessions on the learner's other browsers/devices untouched.
    const { error } = await supabase.auth.signOut({ scope: 'local' });
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

  if (profileLoading || profileUserId !== session.user.id) {
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

  if (profileFailed) {
    return <div className="auth-screen auth-loading-screen"><div className="auth-profile-setup" role="alert" data-testid="profile-load-failure">
      <h2>Your profile could not be loaded</h2><p>Your learning history has not been replaced or reset. Retry the connection or sign out.</p>
      <button type="button" className="auth-submit" onClick={() => setProfileAttempt(n=>n+1)}>Retry profile</button>
      <button type="button" onClick={() => void logout()}>Sair</button>
    </div></div>;
  }

  if (!profile) {
    return (
      <div className="auth-screen auth-loading-screen">
        <div className="auth-profile-setup">
          <div className="auth-brand-mark">LH</div>
          <span className="auth-kicker">ACCESS PENDING</span>
          <h2>Your learning access is not assigned yet</h2>
          <p>An administrator needs to assign this account to its private learning track.</p>
          <button type="button" className="secondary-btn" onClick={() => setProfileAttempt(value => value + 1)}>Check access again</button>
          <button type="button" className="secondary-btn" onClick={() => void logout()}>Sign out</button>
          {errorMessage ? <div className="auth-message error">{errorMessage}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <LearnerSessionContext.Provider key={session.user.id} value={{userId:session.user.id,learnerKey:activeLearner}}>
    <div className={`auth-app learner-${activeLearner}`}>
      {children}
      <button className="auth-signout" type="button" onClick={() => void logout()} title="Sign out of Learning Hub">Sair</button>
    </div>
    </LearnerSessionContext.Provider>
  );
}
