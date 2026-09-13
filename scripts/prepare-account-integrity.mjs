import fs from 'node:fs';
if(process.env.GITHUB_REF_NAME&&process.env.GITHUB_REF_NAME!=='fix/core-consolidation-2026-09-13')throw new Error('wrong_branch');
function edit(path,before,after){const source=fs.readFileSync(path,'utf8');if(source.includes(after))return;if(source.split(before).length!==2)throw new Error(`account_patch_anchor_not_unique: ${path}: ${before.slice(0,80)}`);fs.writeFileSync(path,source.replace(before,after));}
const gate='src/components/AuthGate.tsx';
edit(gate,"import { supabase } from '../services/supabase';", "import { supabase } from '../services/supabase';\nimport { LearnerSessionContext } from '../auth/LearnerSession';\nimport { learnerKeyFromTrack } from '../auth/identity';");
edit(gate,'  if (data) return data as ProfileRow;',`  if (data) {
    if (!learnerKeyFromTrack(data.learner_track)) throw new Error('Unsupported learner profile.');
    return data as ProfileRow;
  }`);
edit(gate,'  const [profile, setProfile] = useState<ProfileRow | null>(null);',`  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [profileFailed, setProfileFailed] = useState(false);
  const [profileAttempt, setProfileAttempt] = useState(0);`);
let g=fs.readFileSync(gate,'utf8');
if(!g.includes('let authRevision = 0;')){
 const start=g.indexOf('  useEffect(() => {\n    let mounted = true;');
 const end=g.indexOf('  const activeLearner = useMemo',start);
 if(start<0||end<start)throw new Error('auth_effect_anchors_missing');
 g=g.slice(0,start)+`  useEffect(() => {
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
    void readOrCreateProfile(user).then(row => {
      if (!cancelled) { setProfile(row); setProfileUserId(user.id); }
    }).catch(() => {
      if (!cancelled) { setProfile(null); setProfileUserId(user.id); setProfileFailed(true); }
    }).finally(() => { if (!cancelled) setProfileLoading(false); });
    return () => { cancelled=true; };
  }, [session?.user?.id,profileAttempt]);

`+g.slice(end);fs.writeFileSync(gate,g);
}
g=fs.readFileSync(gate,'utf8');
if(g.includes('document.querySelectorAll<HTMLButtonElement>')){
 const start=g.indexOf('  useEffect(() => {\n    if (!profile) return;');const end=g.indexOf('  async function submitAuth',start);
 if(start<0||end<start)throw new Error('dom_identity_bridge_anchor_missing');
 g=g.slice(0,start)+g.slice(end);fs.writeFileSync(gate,g);
}
edit(gate,'      setProfile(data as ProfileRow);','      setProfile(data as ProfileRow);\n      setProfileUserId(session.user.id);');
edit(gate,'  if (profileLoading) {','  if (profileLoading || profileUserId !== session.user.id) {');
edit(gate,'  if (!profile) {',`  if (profileFailed) {
    return <div className="auth-screen auth-loading-screen"><div className="auth-profile-setup" role="alert" data-testid="profile-load-failure">
      <h2>Your profile could not be loaded</h2><p>Your learning history has not been replaced or reset. Retry the connection or sign out.</p>
      <button type="button" className="auth-submit" onClick={() => setProfileAttempt(n=>n+1)}>Retry profile</button>
      <button type="button" onClick={() => void logout()}>Sair</button>
    </div></div>;
  }

  if (!profile) {`);
edit(gate,'    <div className={`auth-app learner-${activeLearner}`}>',`    <LearnerSessionContext.Provider key={session.user.id} value={{userId:session.user.id,learnerKey:activeLearner}}>
    <div className={\`auth-app learner-\${activeLearner}\`}>`);
edit(gate,'title="Sign out of Learning Hub">Sair</button>\n    </div>','title="Sign out of Learning Hub">Sair</button>\n    </div>\n    </LearnerSessionContext.Provider>');
const app='src/App.tsx';
edit(app,"import { useCallback, useEffect, useMemo, useState } from 'react';","import { useCallback, useEffect, useMemo, useRef, useState } from 'react';\nimport { useLearnerSession } from './auth/LearnerSession';\nimport { canUseLearnerActions } from './auth/identity';");
edit(app,"import { supabase } from './services/supabase';",'');
edit(app,'function App() {','function App() {\n  const account = useLearnerSession();\n  const memoryRequest = useRef(0);');
edit(app,"const [trackKey, setTrackKey] = useState<TrackKey>('finance');","const [trackKey, setTrackKey] = useState<TrackKey>(account.learnerKey === 'viviane' ? 'payroll' : 'finance');");
edit(app,"const [learnerKey, setLearnerKey] = useState<LearnerKey>('rafael');","const [learnerKey, setLearnerKey] = useState<LearnerKey>(account.learnerKey);");
edit(app,'  const [accountLearnerKey, setAccountLearnerKey] = useState<LearnerKey | null>(null);','  const accountLearnerKey = account.learnerKey;');
let a=fs.readFileSync(app,'utf8');
if(!a.includes('const revision = ++memoryRequest.current;')){
 const start=a.indexOf('  const refreshMemory = useCallback');const end=a.indexOf('  const privateDataVisible',start);
 if(start<0||end<start)throw new Error('app_memory_effect_anchors_missing');
 a=a.slice(0,start)+`  const refreshMemory = useCallback(async () => {
    const revision = ++memoryRequest.current;
    setMemoryLoading(true);
    setMemoryError(false);
    try {
      const result = await loadLearningMemory(account.userId);
      if (revision === memoryRequest.current) setMemory(result);
    } catch {
      if (revision === memoryRequest.current) { setMemory(null); setMemoryError(true); }
    } finally {
      if (revision === memoryRequest.current) setMemoryLoading(false);
    }
  }, [account.userId]);

  useEffect(() => {
    void refreshMemory();
    return () => { memoryRequest.current++; };
  }, [refreshMemory]);

`+a.slice(end);fs.writeFileSync(app,a);
}
edit(app,'const privateDataVisible = accountLearnerKey == null || learnerKey === accountLearnerKey;','const privateDataVisible = learnerKey === accountLearnerKey;');
edit(app,'        <nav className="nav-stack">',`        {!privateDataVisible && <div className="priority-note" role="status" data-testid="account-preview-notice">
          <strong>Profile preview only</strong><span>You are still signed in as {getLearnerProfile(accountLearnerKey).displayName}. Voice and personalised audio actions are unavailable for this preview. Sign out to change accounts.</span>
        </div>}
        <nav className="nav-stack">`);
edit(app,'  const measuredSession = memory?.history.find',"  const account = useLearnerSession();\n  const canUseActions = canUseLearnerActions(account.learnerKey,learnerKey,track.key);\n  const measuredSession = memory?.history.find");
edit(app,"{activeTab === 'Audio' && <PremiumAudioPanel lessonId={track.lessonId} lessonTitle={track.lesson} />}","{activeTab === 'Audio' && (canUseActions ? <PremiumAudioPanel lessonId={track.lessonId} lessonTitle={track.lesson} /> : <p role=\"status\" data-testid=\"audio-account-mismatch\">Audio actions require the matching signed-in learner account.</p>)}");
const memory='src/services/learningMemory.ts';
edit(memory,'export async function loadLearningMemory(): Promise<LearningMemorySnapshot> {','export async function loadLearningMemory(expectedUserId?: string): Promise<LearningMemorySnapshot> {');
edit(memory,"  if (authError || !authData.user) throw authError ?? new Error('authentication_required');", "  if (authError || !authData.user) throw authError ?? new Error('authentication_required');\n  if (expectedUserId && authData.user.id !== expectedUserId) throw new Error('learner_account_changed');\n  const userId = authData.user.id;");
for(const table of ['ai_tutor_sessions','user_competency_scores','user_error_bank','spaced_reviews']){
 const marker=`.from('${table}')`;const s=fs.readFileSync(memory,'utf8');const at=s.indexOf(marker);const end=s.indexOf('\n      .',s.indexOf('.select(',at));
 const next=s.slice(end,end+35);
 if(next.includes(".eq('user_id'"))continue;
 if(at<0||end<at)throw new Error('memory_scope_anchor_missing');
 fs.writeFileSync(memory,s.slice(0,end)+"\n      .eq('user_id', userId)"+s.slice(end));
}
edit(memory,'  return {\n    latest: history[0] ?? null,',"  const {data: currentSession} = await supabase.auth.getSession();\n  if (currentSession.session?.user.id !== userId) throw new Error('learner_account_changed');\n  return {\n    latest: history[0] ?? null,");
const panel='src/components/ProfessorSessionPanel.tsx';
edit(panel,"import { useEffect, useRef, useState } from 'react';", "import { useEffect, useRef, useState } from 'react';\nimport { useLearnerSession } from '../auth/LearnerSession';\nimport { canUseLearnerActions } from '../auth/identity';");
edit(panel,"  const enabled = isFeatureEnabled('professor');", "  const account = useLearnerSession();\n  const accountMatches = canUseLearnerActions(account.learnerKey,learnerKey,track);\n  const enabled = isFeatureEnabled('professor');\n  const connectionAbortRef = useRef<AbortController | null>(null);");
edit(panel,'  useEffect(() => () => {\n    void connectionRef.current?.disconnect();','  useEffect(() => () => {\n    connectionAbortRef.current?.abort();\n    void connectionRef.current?.disconnect().catch(() => undefined);');
edit(panel,"    if (!enabled || state === 'connecting' || state === 'listening') return;","    if (!enabled || !accountMatches || state === 'connecting' || state === 'listening') return;\n    const controller = new AbortController();\n    connectionAbortRef.current = controller;");
edit(panel,`          onRemoteAudio: attachRemoteAudio,
          onAudioPlaybackStatusChanged: (canPlaybackAudio) => setAudioBlocked(!canPlaybackAudio),
          onDisconnected: () => setState('ended'),`, `          signal: controller.signal,
          expectedUserId: account.userId,
          onRemoteAudio: remote => { if (!controller.signal.aborted) attachRemoteAudio(remote); },
          onAudioPlaybackStatusChanged: canPlaybackAudio => { if (!controller.signal.aborted) setAudioBlocked(!canPlaybackAudio); },
          onDisconnected: () => { if (!controller.signal.aborted) setState('ended'); },`);
edit(panel,'      connectionRef.current = connection;','      if (controller.signal.aborted) { await connection.disconnect(); return; }\n      connectionRef.current = connection;');
edit(panel,"    } catch (cause) {\n      setError", "    } catch (cause) {\n      if (controller.signal.aborted) return;\n      setError");
edit(panel,'  async function stop() {','  async function stop() {\n    connectionAbortRef.current?.abort();\n    connectionAbortRef.current = null;');
edit(panel,'    if (connection) await connection.disconnect();','    if (connection) await connection.disconnect().catch(() => undefined);');
edit(panel,"disabled={!enabled || state === 'connecting'}","disabled={!enabled || !accountMatches || state === 'connecting'}");
edit(panel,'      <div className="professor-live-actions">',`      {!accountMatches && <p role="status" data-testid="professor-account-mismatch">This is a profile preview. Return to your signed-in learner or sign out to change accounts before starting the Professor.</p>}
      {state === 'connecting' && <button type="button" className="secondary-btn" onClick={() => void stop()}>Cancel connection</button>}
      <div className="professor-live-actions">`);
const api='api/livekit-token.ts';
edit(api,"import { randomUUID } from 'node:crypto';","import { randomUUID } from 'node:crypto';\nimport { requestedLearnerMatchesAccount } from '../src/auth/identity.js';");
edit(api,'  let lessonContext: LessonContext;',"  if (!requestedLearnerMatchesAccount(learnerProfile.learner_track,body.learnerId)) return send(res,403,{error:'professor_learner_mismatch'});\n\n  let lessonContext: LessonContext;");
const smoke='tests/smoke.spec.ts';
edit(smoke,"const e2eEmail = process.env.E2E_EMAIL;\nconst e2ePassword = process.env.E2E_PASSWORD;\nconst authenticatedFixtureAvailable = Boolean(e2eEmail && e2ePassword);", "import {resolveAuthFixture} from './helpers/auth-fixture';\nconst {email:e2eEmail,password:e2ePassword,available:authenticatedFixtureAvailable} = resolveAuthFixture(process.env);");
console.log('Prepared account-bound profile loading, scoped memory and cancellable Professor startup. Existing auth/RLS remain authoritative; no database or runtime deployment.');
