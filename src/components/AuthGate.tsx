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

type AuthMode = 'sign-in' | 'request-reset' | 'update-password';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    let authRevision = 0;
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      authRevision++;
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('update-password');
        setErrorMessage(null);
        setSuccessMessage(null);
      }
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
    if (!session?.user || authMode === 'update-password') return;
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
  }, [session?.user?.id,profileAttempt,authMode]);

  const activeLearner = useMemo(() => profile ? learnerFromTrack(profile.learner_track) : 'rafael', [profile]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível concluir o acesso.');
    } finally {
      setSubmitting(false);
    }
  }

  async function requestPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const redirectTo = `${window.location.origin}/`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) throw error;
      setSuccessMessage('If this e-mail is assigned to the Language Hub, a secure recovery link has been sent.');
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível enviar o link de recuperação.');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitNewPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (newPassword !== newPasswordConfirmation) {
      setErrorMessage('As senhas não coincidem.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
      if (signOutError) throw signOutError;
      setNewPassword('');
      setNewPasswordConfirmation('');
      setPassword('');
      setAuthMode('sign-in');
      setSuccessMessage('Senha alterada. Entre novamente com a nova senha.');
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível alterar a senha.');
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
          <strong>Language Hub</strong>
          <span>Preparing your secure learning workspace…</span>
        </div>
      </div>
    );
  }

  if (!session || authMode === 'update-password') {
    const isResetRequest = authMode === 'request-reset';
    const isPasswordUpdate = authMode === 'update-password';
    return (
      <div className="auth-screen">
        <section className="auth-hero">
          <div className="auth-brand-row">
            <div className="auth-brand-mark">LH</div>
            <div>
              <strong>Language Hub</strong>
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
              <span>{isPasswordUpdate ? 'SECURE RECOVERY' : isResetRequest ? 'ACCOUNT RECOVERY' : 'WELCOME BACK'}</span>
              <h2>{isPasswordUpdate ? 'Choose a new password' : isResetRequest ? 'Recover your access' : 'Enter Language Hub'}</h2>
              <p>{isPasswordUpdate ? 'Create a new password for your Language Hub account.' : isResetRequest ? 'We will send a secure recovery link to the assigned e-mail.' : 'Use the account assigned to this Language Hub.'}</p>
            </div>

            {isPasswordUpdate ? (
              <form className="auth-form" onSubmit={submitNewPassword}>
                <label>
                  <span>Nova senha</span>
                  <input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} required placeholder="Mínimo de 8 caracteres" />
                </label>
                <label>
                  <span>Confirme a nova senha</span>
                  <input type="password" autoComplete="new-password" value={newPasswordConfirmation} onChange={(event) => setNewPasswordConfirmation(event.target.value)} minLength={8} required placeholder="Digite novamente" />
                </label>
                {errorMessage ? <div className="auth-message error">{errorMessage}</div> : null}
                <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? 'Aguarde…' : 'Alterar senha'}</button>
              </form>
            ) : isResetRequest ? (
              <form className="auth-form" onSubmit={requestPasswordReset}>
                <label>
                  <span>E-mail</span>
                  <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="seu@email.com" />
                </label>
                {errorMessage ? <div className="auth-message error">{errorMessage}</div> : null}
                {successMessage ? <div className="auth-message success">{successMessage}</div> : null}
                <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? 'Enviando…' : 'Enviar link de recuperação'}</button>
                <button className="auth-mode-switch" type="button" onClick={() => { setAuthMode('sign-in'); setErrorMessage(null); setSuccessMessage(null); }}>Voltar para o login</button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={submitAuth}>
                <label>
                  <span>E-mail</span>
                  <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="seu@email.com" />
                </label>
                <label>
                  <span>Senha</span>
                  <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required placeholder="Mínimo de 8 caracteres" />
                </label>
                {errorMessage ? <div className="auth-message error">{errorMessage}</div> : null}
                {successMessage ? <div className="auth-message success">{successMessage}</div> : null}
                <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? 'Aguarde…' : 'Entrar'}</button>
                <button className="auth-mode-switch" type="button" onClick={() => { setAuthMode('request-reset'); setPassword(''); setErrorMessage(null); setSuccessMessage(null); }}>Esqueci minha senha</button>
              </form>
            )}

            {!isPasswordUpdate ? <p className="auth-registration-note" data-testid="registration-closed">
              New account registration is temporarily unavailable while secure access assignment is being installed.
            </p> : null}

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
        <div className="auth-profile-setup" data-testid="profile-assignment-pending">
          <div className="auth-brand-mark">LH</div>
          <span className="auth-kicker">ACCESS PENDING</span>
          <h2>Your learning access is not assigned yet</h2>
          <p>An administrator needs to assign this account to its private learning track.</p>
          <button type="button" className="auth-submit" onClick={() => setProfileAttempt(value => value + 1)}>Check access again</button>
          <button type="button" onClick={() => void logout()}>Sair</button>
          {errorMessage ? <div className="auth-message error">{errorMessage}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <LearnerSessionContext.Provider key={session.user.id} value={{userId:session.user.id,learnerKey:activeLearner}}>
    <div className={`auth-app learner-${activeLearner}`}>
      {children}
      <button className="auth-signout" type="button" onClick={() => void logout()} title="Sign out of Language Hub">Sair</button>
    </div>
    </LearnerSessionContext.Provider>
  );
}
