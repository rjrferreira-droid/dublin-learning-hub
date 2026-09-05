import { useCallback, useEffect, useMemo, useState } from 'react';
import { PremiumAudioPanel } from './components/PremiumAudioPanel';
import { ProfessorSessionPanel } from './components/ProfessorSessionPanel';
import { getLearnerProfile, type LearnerKey, type LearningProfile } from './learners/profiles';
import { DEFAULT_WEEK, PROFESSOR_MODES } from './learning/englishAcademy';
import { rankAdaptivePriorities, type AdaptivePriority, type ReviewSignal } from './learning/adaptiveEngine';
import type { CompetencySignal, ErrorBankItem } from './services/contracts';
import {
  loadLearningMemory,
  type LearningMemorySession,
  type LearningMemorySnapshot,
} from './services/learningMemory';
import { supabase } from './services/supabase';

type TrackKey = 'finance' | 'payroll' | 'english';
type ViewKey = 'dashboard' | 'learn' | 'revision' | 'performance' | 'professor' | 'error-bank' | 'english-academy';

type Track = {
  key: TrackKey;
  name: string;
  subtitle: string;
  learner: string;
  accent: string;
  lesson: string;
  lessonId: string;
  focus: string;
};

const tracks: Track[] = [
  {
    key: 'finance',
    name: 'Finance Ireland',
    subtitle: 'Corporate Finance • ACCA • Dublin',
    learner: 'Rafael',
    accent: 'FINANCE',
    lesson: 'IFRS 18, Group Reporting & Irish Statutory Accounts',
    lessonId: 'b3639582-3c32-4147-a4b3-84237d11a66e',
    focus: 'Executive finance judgement, reporting and Dublin readiness',
  },
  {
    key: 'payroll',
    name: 'Irish Payroll',
    subtitle: 'PAYE • USC • PRSI • Revenue',
    learner: 'Viviane',
    accent: 'PAYROLL',
    lesson: 'Gross-to-Net: RPN, PAYE, USC & PRSI',
    lessonId: '6ffda415-3b18-46ab-afaa-414f81a7eb31',
    focus: 'Irish payroll operations, controls and professional English',
  },
  {
    key: 'english',
    name: 'English Academy',
    subtitle: 'General • Professional • UK + US + Ireland',
    learner: 'Rafael & Viviane',
    accent: 'ENGLISH',
    lesson: 'Tell a story naturally: past forms, rhythm & follow-up questions',
    lessonId: 'f455a740-f50f-4eb7-95a7-9e4129ca4a68',
    focus: 'Everyday fluency, listening, grammar, pronunciation and work English',
  },
];

const lessonTabs = ['Learn', 'Audio', 'English', 'Practice', 'Visual', 'Case', 'Test', 'Sources', 'Professor'];
const reviewIntervals = new Set(['D+1', 'D+7', 'D+30', 'D+90']);
const errorDomains = new Set(['technical', 'grammar', 'vocabulary', 'pronunciation', 'fluency', 'register']);

type MemoryStatus = 'loading' | 'ready' | 'empty' | 'unavailable' | 'other-profile';

function scorePairs(session: LearningMemorySession) {
  return [
    ['Technical Accuracy', session.technicalScore],
    ['English', session.englishScore],
    ['Grammar', session.grammarScore],
    ['Vocabulary', session.vocabularyScore],
    ['Fluency', session.fluencyScore],
    ['Pronunciation', session.pronunciationScore],
    ['Professional Communication', session.professionalCommunicationScore],
  ].filter((pair): pair is [string, number] => typeof pair[1] === 'number');
}

function sessionAverage(session: LearningMemorySession | null | undefined): number | null {
  if (!session) return null;
  const values = scorePairs(session).map(([, value]) => value);
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function shortDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IE', { day: '2-digit', month: 'short' }).format(date);
}

function realIntelligence(snapshot: LearningMemorySnapshot | null, learnerKey: LearnerKey): {
  competencies: CompetencySignal[];
  errors: ErrorBankItem[];
  reviews: ReviewSignal[];
} {
  if (!snapshot) return { competencies: [], errors: [], reviews: [] };

  const competencies: CompetencySignal[] = snapshot.competencies.map((item) => ({
    competencyId: item.code,
    label: item.name,
    score: Math.round(item.score),
    priority: item.score < 70,
  }));

  const errors: ErrorBankItem[] = snapshot.errors.map((item) => ({
    id: item.id,
    learnerId: learnerKey,
    domain: errorDomains.has(item.domain) ? item.domain as ErrorBankItem['domain'] : 'technical',
    pattern: item.pattern,
    confidence: Math.round(item.confidence),
    frequency: item.frequency,
    status: item.status === 'mastered' || item.status === 'archived' ? item.status : 'active',
    lastSeenAt: item.lastSeenAt,
    nextReviewAt: item.nextReviewAt,
  }));

  const reviews: ReviewSignal[] = snapshot.reviews.flatMap((item) => {
    if (!reviewIntervals.has(item.stage)) return [];
    return [{
      id: item.id,
      label: item.label,
      dueAt: item.dueDate,
      interval: item.stage as ReviewSignal['interval'],
      score: item.score ?? undefined,
    }];
  });

  return { competencies, errors, reviews };
}

function App() {
  const [view, setView] = useState<ViewKey>('dashboard');
  const [trackKey, setTrackKey] = useState<TrackKey>('finance');
  const [lessonOpen, setLessonOpen] = useState(false);
  const [lessonTab, setLessonTab] = useState('Learn');
  const [learnerKey, setLearnerKey] = useState<LearnerKey>('rafael');
  const [accountLearnerKey, setAccountLearnerKey] = useState<LearnerKey | null>(null);
  const [memory, setMemory] = useState<LearningMemorySnapshot | null>(null);
  const [memoryLoading, setMemoryLoading] = useState(true);
  const [memoryError, setMemoryError] = useState(false);

  const profile = useMemo(() => getLearnerProfile(learnerKey), [learnerKey]);
  const activeTrack = useMemo(() => tracks.find((t) => t.key === trackKey) ?? tracks[0], [trackKey]);

  const refreshMemory = useCallback(async () => {
    setMemoryLoading(true);
    setMemoryError(false);
    try {
      const result = await loadLearningMemory();
      setMemory(result);
    } catch {
      setMemory(null);
      setMemoryError(true);
    } finally {
      setMemoryLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled || !data.user) return;
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('learner_track')
        .eq('id', data.user.id)
        .maybeSingle();
      if (cancelled || !profileRow) return;
      const key: LearnerKey = profileRow.learner_track === 'viviane_payroll' ? 'viviane' : 'rafael';
      setAccountLearnerKey(key);
      setLearnerKey(key);
      setTrackKey(key === 'viviane' ? 'payroll' : 'finance');
    });
    void refreshMemory();
    return () => { cancelled = true; };
  }, [refreshMemory]);

  const privateDataVisible = accountLearnerKey == null || learnerKey === accountLearnerKey;
  const visibleMemory = privateDataVisible ? memory : null;
  const memoryStatus: MemoryStatus = !privateDataVisible
    ? 'other-profile'
    : memoryLoading
      ? 'loading'
      : memoryError
        ? 'unavailable'
        : visibleMemory?.latest
          ? 'ready'
          : 'empty';

  const openLesson = (key: TrackKey) => {
    setTrackKey(key);
    setLessonTab('Learn');
    setLessonOpen(true);
    setView('learn');
  };

  const selectLearner = (key: LearnerKey) => {
    setLearnerKey(key);
    setLessonOpen(false);
    setView('dashboard');
    setTrackKey(key === 'viviane' ? 'payroll' : 'finance');
  };

  return (
    <div className="app-frame">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand-row">
          <div className="brand-mark">LH</div>
          <div>
            <div className="brand-name">Learning Hub</div>
            <div className="brand-sub">PREMIUM LEARNING</div>
          </div>
        </div>

        <div className="profile-card profile-card-v2" data-testid="active-learner-card">
          <div className="avatar">{profile.initials}</div>
          <div className="profile-card-copy">
            <strong>{profile.displayName}</strong>
            <span>{profile.primaryTrack === 'rafael_finance' ? 'Finance Ireland' : 'Irish Payroll'} • Dublin 2028/29</span>
          </div>
          <div className="status-dot" title="Profile active" />
        </div>
        <div className="learner-switch" aria-label="Learner profile">
          <button className={learnerKey === 'rafael' ? 'active' : ''} onClick={() => selectLearner('rafael')}>Rafael</button>
          <button className={learnerKey === 'viviane' ? 'active' : ''} onClick={() => selectLearner('viviane')}>Viviane</button>
        </div>

        <nav className="nav-stack">
          <NavButton label="Dashboard" icon="⌂" active={view === 'dashboard'} onClick={() => { setView('dashboard'); setLessonOpen(false); }} />
          <NavButton label="Learning" icon="▤" active={view === 'learn'} onClick={() => { setView('learn'); setLessonOpen(false); }} />
          <NavButton label="English Academy" icon="EN" active={view === 'english-academy'} onClick={() => { setView('english-academy'); setLessonOpen(false); }} />
          <NavButton label="Revision" icon="↻" active={view === 'revision'} onClick={() => { setView('revision'); setLessonOpen(false); }} />
          <NavButton label="Error Bank" icon="!" active={view === 'error-bank'} onClick={() => { setView('error-bank'); setLessonOpen(false); }} />
          <NavButton label="Performance" icon="◫" active={view === 'performance'} onClick={() => { setView('performance'); setLessonOpen(false); }} />
          <NavButton label="Professor" icon="◉" active={view === 'professor'} onClick={() => { setView('professor'); setLessonOpen(false); }} />
        </nav>

        <div className="side-divider" />
        <div className="side-caption">LEARNING TRACKS</div>
        <div className="track-mini-list">
          {tracks.map((track) => (
            <button key={track.key} className={`track-mini ${trackKey === track.key ? 'selected' : ''}`} onClick={() => setTrackKey(track.key)}>
              <span className={`track-dot ${track.key}`} />
              <span>{track.name}</span>
            </button>
          ))}
        </div>

        <div className="side-footer">
          <div className="environment-pill">V2 BUILD • PREVIEW</div>
          <span>Measured evidence only</span>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <div className="eyebrow">{profile.displayName.toUpperCase()} • DUBLIN 2028/29</div>
            <h1>{lessonOpen ? activeTrack.lesson : titleForView(view)}</h1>
            <p>{lessonOpen ? activeTrack.focus : subtitleForView(view, profile)}</p>
          </div>
          <div className="top-actions">
            <span className="cefr-pill">English {profile.english.cefr} → {profile.english.targetCefr}</span>
            <button className="ghost-btn" onClick={() => { setView('dashboard'); setLessonOpen(false); }}>Today</button>
            <button className="round-btn" aria-label="Refresh measured learning" onClick={() => void refreshMemory()}>↻</button>
          </div>
        </header>

        {lessonOpen ? (
          <LessonView track={activeTrack} learnerKey={learnerKey} memory={visibleMemory} activeTab={lessonTab} setActiveTab={setLessonTab} close={() => { setLessonOpen(false); setView('dashboard'); }} />
        ) : view === 'dashboard' ? (
          <Dashboard learnerKey={learnerKey} profile={profile} memory={visibleMemory} memoryStatus={memoryStatus} openLesson={openLesson} openView={setView} />
        ) : view === 'learn' ? (
          <LearningLibrary learnerKey={learnerKey} openLesson={openLesson} />
        ) : view === 'english-academy' ? (
          <EnglishAcademyView profile={profile} learnerKey={learnerKey} openLesson={() => openLesson('english')} />
        ) : view === 'revision' ? (
          <RevisionView memory={visibleMemory} memoryStatus={memoryStatus} />
        ) : view === 'error-bank' ? (
          <ErrorBankView memory={visibleMemory} memoryStatus={memoryStatus} />
        ) : view === 'performance' ? (
          <PerformanceView memory={visibleMemory} memoryStatus={memoryStatus} />
        ) : (
          <ProfessorView learnerKey={learnerKey} profile={profile} openLesson={openLesson} />
        )}
      </main>
    </div>
  );
}

function NavButton({ label, icon, active, onClick }: { label: string; icon: string; active: boolean; onClick: () => void }) {
  return (
    <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="nav-icon">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function evidenceMessage(status: MemoryStatus) {
  if (status === 'loading') return 'Reading measured learning evidence…';
  if (status === 'unavailable') return 'Measured learning evidence is temporarily unavailable. No placeholder scores are being substituted.';
  if (status === 'other-profile') return 'This profile has separate private learning evidence. Sign in with that learner account to see measured results.';
  return 'Complete a Professor session to establish a measured baseline. Until then, the Learning Hub will not invent scores or priorities.';
}

function EmptyEvidence({ status }: { status: MemoryStatus }) {
  return (
    <article className="adaptive-priority-card">
      <div className="priority-rank">—</div>
      <div className="priority-copy">
        <div className="priority-meta"><span>MEASURED EVIDENCE</span><b>No synthetic priority</b></div>
        <h3>Baseline pending</h3>
        <p>{evidenceMessage(status)}</p>
      </div>
      <span className="action-chip">REAL DATA ONLY</span>
    </article>
  );
}

function Dashboard({ learnerKey, profile, memory, memoryStatus, openLesson, openView }: {
  learnerKey: LearnerKey;
  profile: LearningProfile;
  memory: LearningMemorySnapshot | null;
  memoryStatus: MemoryStatus;
  openLesson: (key: TrackKey) => void;
  openView: (view: ViewKey) => void;
}) {
  const intelligence = useMemo(() => realIntelligence(memory, learnerKey), [memory, learnerKey]);
  const priorities = useMemo(() => rankAdaptivePriorities({ ...intelligence, now: new Date(), limit: 4 }), [intelligence]);
  const primaryTrack: TrackKey = learnerKey === 'viviane' ? 'payroll' : 'finance';
  const primaryLabel = learnerKey === 'viviane' ? 'Continue Payroll' : 'Continue Finance';
  const dueReviews = memory?.reviews.filter((item) => item.status === 'due').length ?? 0;
  const measuredCompetencies = memory?.competencies.length ?? 0;
  const evaluatedSessions = memory?.history.length ?? 0;

  return (
    <section className="content-grid dashboard-grid">
      <div className="hero-panel">
        <div className="hero-kicker">TODAY'S FOCUS • {profile.displayName.toUpperCase()}</div>
        <h2>Build capability, not just knowledge.</h2>
        <p>Measured Professor sessions, recurring errors and spaced reviews determine adaptive priorities. When evidence is missing, the portal says so instead of filling the gap with demo scores.</p>
        <div className="hero-actions">
          <button className="primary-btn" onClick={() => openLesson(primaryTrack)}>{primaryLabel}</button>
          <button className="secondary-btn" onClick={() => openLesson('english')}>Start English practice</button>
        </div>
        <div className="union-accent" aria-hidden="true" />
      </div>

      <div className="metric-card">
        <div className="metric-label">REVIEWS DUE</div>
        <div className="metric-value">{dueReviews}</div>
        <div className="metric-foot">{memory?.reviews.length ?? 0} scheduled in memory</div>
      </div>
      <div className="metric-card">
        <div className="metric-label">MEASURED COMPETENCIES</div>
        <div className="metric-value">{measuredCompetencies}</div>
        <div className="metric-foot">from evaluated evidence</div>
      </div>
      <div className="metric-card">
        <div className="metric-label">EVALUATED SESSIONS</div>
        <div className="metric-value">{evaluatedSessions}</div>
        <div className="metric-foot">private learner history</div>
      </div>

      <div className="section-heading full-span">
        <div>
          <div className="eyebrow">ADAPTIVE CURRICULUM</div>
          <h2>Your next actions are ranked by learning need</h2>
        </div>
        <button className="text-action" onClick={() => openView('error-bank')}>Open Error Bank →</button>
      </div>

      <div className="adaptive-priority-stack full-span" data-testid="adaptive-priority-stack">
        {priorities.length > 0
          ? priorities.map((priority, index) => <PriorityCard key={priority.key} priority={priority} rank={index + 1} />)
          : <EmptyEvidence status={memoryStatus} />}
      </div>

      <div className="section-heading full-span">
        <div>
          <div className="eyebrow">YOUR PROGRAMMES</div>
          <h2>Three connected learning tracks</h2>
        </div>
        <span>Measured sessions • Error Bank • spaced review</span>
      </div>

      {tracks.map((track) => {
        const trackSessions = memory?.history.filter((session) => session.lessonId === track.lessonId) ?? [];
        const latestTrackSession = trackSessions[0] ?? null;
        const measuredAverage = sessionAverage(latestTrackSession);
        return (
          <article className={`track-card ${track.key === primaryTrack ? 'primary-track-card' : ''}`} key={track.key}>
            <div className="track-card-head">
              <span className={`track-badge ${track.key}`}>{track.accent}</span>
              <span className="readiness-pill">{measuredAverage == null ? 'Awaiting evidence' : `${Math.round(measuredAverage)}% measured`}</span>
            </div>
            <h3>{track.name}</h3>
            <p className="track-subtitle">{track.subtitle}</p>
            <p className="next-label">NEXT GOLDEN LESSON</p>
            <strong className="lesson-name">{track.lesson}</strong>
            <div className="progress-row">
              <span>{trackSessions.length === 0 ? 'No evaluated session yet' : `${trackSessions.length} evaluated session${trackSessions.length === 1 ? '' : 's'} • latest ${shortDate(latestTrackSession?.completedAt ?? latestTrackSession?.startedAt)}`}</span>
            </div>
            <button className="card-action" onClick={() => openLesson(track.key)}>Continue learning →</button>
          </article>
        );
      })}

      <div className="wide-card full-span">
        <div>
          <div className="eyebrow">LEARNING LOOP</div>
          <h3>Every measured result changes what happens next.</h3>
          <p>Professor conversations feed independent evaluation. Weak competencies and recurring mistakes return through the Error Bank and spaced reviews.</p>
        </div>
        <div className="engine-flow">
          <span>Tutor</span><b>→</b><span>Evaluator</span><b>→</b><span>Error Bank</span><b>→</b><span>Curriculum Engine</span><b>→</b><span>Next action</span>
        </div>
      </div>
    </section>
  );
}

function PriorityCard({ priority, rank }: { priority: AdaptivePriority; rank: number }) {
  const sourceLabel = priority.source === 'error-bank' ? 'ERROR BANK' : priority.source === 'spaced-review' ? 'SPACED REVIEW' : 'COMPETENCY';
  return (
    <article className="adaptive-priority-card">
      <div className="priority-rank">0{rank}</div>
      <div className="priority-copy">
        <div className="priority-meta"><span>{sourceLabel}</span><b>{priority.score}/100 priority</b></div>
        <h3>{priority.label}</h3>
        <p>{priority.reason}</p>
      </div>
      <span className="action-chip">{priority.recommendedAction.replace('-', ' ')}</span>
    </article>
  );
}

function LearningLibrary({ learnerKey, openLesson }: { learnerKey: LearnerKey; openLesson: (key: TrackKey) => void }) {
  const primaryTrack = learnerKey === 'viviane' ? 'payroll' : 'finance';
  return (
    <section className="page-stack">
      <div className="section-heading">
        <div><div className="eyebrow">GOLDEN LESSONS</div><h2>Validate the full experience before scaling content</h2></div>
        <span>3 lessons • end-to-end quality gate</span>
      </div>
      <div className="library-grid">
        {tracks.map((track, index) => (
          <article className={`lesson-library-card ${track.key === primaryTrack ? 'primary-track-card' : ''}`} key={track.key}>
            <div className="lesson-index">0{index + 1}</div>
            <span className={`track-badge ${track.key}`}>{track.accent}</span>
            <h3>{track.lesson}</h3>
            <p>{track.focus}</p>
            <div className="lesson-meta"><span>10–15 min</span><span>Case</span><span>Quiz</span><span>Professor</span></div>
            <button className="primary-btn" onClick={() => openLesson(track.key)}>Open Golden Lesson</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function LessonView({ track, learnerKey, memory, activeTab, setActiveTab, close }: {
  track: Track;
  learnerKey: LearnerKey;
  memory: LearningMemorySnapshot | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  close: () => void;
}) {
  const measuredSession = memory?.history.find((session) => session.lessonId === track.lessonId) ?? null;
  const measuredScores = measuredSession ? scorePairs(measuredSession) : [];

  return (
    <section className="lesson-shell" data-testid="lesson-shell">
      <div className="lesson-toolbar">
        <button className="back-btn" onClick={close}>← Dashboard</button>
        <div className="lesson-progress"><span>Golden Lesson</span><b>{measuredSession ? `Last evaluated ${shortDate(measuredSession.completedAt ?? measuredSession.startedAt)}` : 'Baseline not measured yet'}</b></div>
      </div>
      <div className="lesson-tabs" role="tablist">
        {lessonTabs.map((tab) => (
          <button key={tab} role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>{tab}</button>
        ))}
      </div>
      <div className="lesson-layout">
        <article className="lesson-content-card">
          <div className="track-card-head"><span className={`track-badge ${track.key}`}>{track.accent}</span><span className="readiness-pill">Premium lesson</span></div>
          <div className="eyebrow">{activeTab.toUpperCase()}</div>
          {activeTab === 'Learn' && <LearnPanel track={track} />}
          {activeTab === 'Audio' && <PremiumAudioPanel lessonId={track.lessonId} lessonTitle={track.lesson} />}
          {activeTab === 'English' && <EnglishPanel track={track} />}
          {activeTab === 'Practice' && <PracticePanel track={track} />}
          {activeTab === 'Visual' && <VisualPanel />}
          {activeTab === 'Case' && <CasePanel track={track} />}
          {activeTab === 'Test' && <TestPanel />}
          {activeTab === 'Sources' && <SourcesPanel />}
          {activeTab === 'Professor' && <InlineProfessorPanel learnerKey={learnerKey} track={track} />}
        </article>
        <aside className="lesson-side-card">
          <div className="eyebrow">MEASURED LEARNING SIGNALS</div>
          <h3>{measuredSession ? 'Latest evaluated evidence' : 'Baseline pending'}</h3>
          {measuredScores.length > 0
            ? measuredScores.map(([label, value]) => <Signal key={label} label={label} value={Math.round(value)} />)
            : <div className="priority-note"><strong>No synthetic score</strong><span>Complete an evaluated Professor session for this lesson. Scores will appear only after measured evidence exists.</span></div>}
          {measuredSession?.feedback?.summary ? <div className="priority-note"><strong>Evaluator summary</strong><span>{measuredSession.feedback.summary}</span></div> : null}
        </aside>
      </div>
    </section>
  );
}

function LearnPanel({ track }: { track: Track }) {
  return <div className="reading-copy"><h2>{track.lesson}</h2><p className="lead">A Golden Lesson proves the complete Learning Hub experience before the curriculum scales.</p><h3>Learning objective</h3><p>Understand the core concept, explain it clearly, apply it to a realistic decision and defend your reasoning in a short professional conversation.</p><div className="callout"><strong>Active learning rule</strong><span>You will be asked to retrieve and apply the concept before the system shows model reasoning.</span></div><h3>Why this matters</h3><p>{track.focus}. The final goal is employability and practical confidence, not passive completion.</p></div>;
}

function EnglishPanel({ track }: { track: Track }) {
  const terms = track.key === 'english' ? ['follow-up question', 'natural phrasing', 'word stress', 'story arc', 'register'] : ['judgement', 'reconciliation', 'variance', 'stakeholder', 'control'];
  return <div className="reading-copy"><h2>English in context</h2><p className="lead">Technical and everyday language is trained as usable speech, not as a vocabulary list.</p><div className="term-grid">{terms.map((term) => <div className="term-card" key={term}><strong>{term}</strong><span>Listen • use it • retrieve it later</span></div>)}</div></div>;
}

function PracticePanel({ track }: { track: Track }) {
  return <div className="reading-copy"><h2>Quick retrieval</h2><p className="lead">This practice surface is available for drafting; automatic scoring is not yet connected here.</p><div className="question-box"><strong>{track.key === 'english' ? 'Tell the same story in 30 seconds without using “and then” more than once.' : 'What would you investigate first, and why?'}</strong><textarea placeholder="Write your answer here…" /><button className="primary-btn" disabled>Scoring not connected yet</button></div></div>;
}

function VisualPanel() {
  return <div className="reading-copy"><h2>Visual challenge</h2><p className="lead">Interpret the signal, identify the issue and explain your conclusion. This visual is a practice prompt, not a scored result.</p><div className="visual-demo"><div className="visual-bar a"/><div className="visual-bar b"/><div className="visual-bar c"/><div className="visual-bar d"/><div className="visual-bar e"/></div><p>Which movement requires management attention first? Explain the business implication.</p></div>;
}

function CasePanel({ track }: { track: Track }) {
  return <div className="reading-copy"><h2>Manager case</h2><div className="case-box"><span>SCENARIO</span><p>{track.key === 'payroll' ? 'An employee says net pay unexpectedly fell after a payroll change. Revenue data, employee setup and deductions all need to be checked before responding.' : track.key === 'english' ? 'You have moved to Dublin and need to call a letting agent because the heating has stopped. Explain the issue clearly, ask what happens next and respond to follow-up questions.' : 'Month-end reporting is complete, but working capital deteriorated while EBITDA improved. The Regional CFO asks for a concise explanation and next actions.'}</p></div><textarea className="case-answer" placeholder="Build your response…" /><button className="primary-btn" disabled>Independent case scoring not connected yet</button></div>;
}

function TestPanel() {
  return <div className="reading-copy"><h2>Checkpoint</h2><p className="lead">The question is available for practice, but this surface does not write a competency score yet.</p><div className="question-box"><strong>Which answer demonstrates the strongest professional judgement?</strong>{['State the rule only.', 'State the rule and repeat the data.', 'Explain the conclusion, evidence, risk and next action.', 'Escalate immediately without analysis.'].map((x, i) => <label className="option-row" key={x}><input type="radio" name="q1"/><span>{String.fromCharCode(65+i)}. {x}</span></label>)}<button className="primary-btn" disabled>Measured scoring not connected yet</button></div></div>;
}

function SourcesPanel() {
  return <div className="reading-copy"><h2>Sources & freshness</h2><p className="lead">A production-grade source package has not yet been published on this lesson screen.</p><div className="source-row"><strong>Authority status</strong><span>Not yet displayed in this surface</span></div><div className="source-row"><strong>Freshness status</strong><span className="freshness">Do not treat placeholder lesson copy as authoritative source evidence</span></div></div>;
}

function InlineProfessorPanel({ learnerKey, track }: { learnerKey: LearnerKey; track: Track }) {
  return <div className="reading-copy"><h2>Professor</h2><p className="lead">Live voice tutoring uses the deployed LiveKit + OpenAI Realtime path. Completed sessions feed Learning Memory and independent evaluation.</p><ProfessorSessionPanel lessonId={track.lessonId} track={track.key} learnerKey={learnerKey} /><div className="callout"><strong>Safety by design</strong><span>No raw learner voice stored by default. The learning record is persisted for evaluation and adaptation.</span></div></div>;
}

function Signal({ label, value }: { label: string; value: number }) {
  return <div className="signal-row"><div><span>{label}</span><b>{value}%</b></div><div className="progress-track"><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div></div>;
}

function EnglishAcademyView({ profile, learnerKey, openLesson }: { profile: LearningProfile; learnerKey: LearnerKey; openLesson: () => void }) {
  return (
    <section className="page-stack" data-testid="english-academy-view">
      <div className="academy-hero">
        <div>
          <div className="eyebrow light">ENGLISH ACADEMY • {profile.displayName.toUpperCase()}</div>
          <h2>General English first. Professional confidence built on top.</h2>
          <p>British and American English are both accepted, with deliberate Irish exposure for real life in Dublin. The programme adapts to the learner rather than forcing one fixed textbook path.</p>
          <div className="hero-actions"><button className="primary-btn" onClick={openLesson}>Open English Golden Lesson</button><span className="academy-level">{profile.english.cefr} provisional • {profile.english.targetCefr} target</span></div>
        </div>
        <div className="exposure-ring" aria-label="Language exposure mix"><strong>40 / 40 / 20</strong><span>UK • US • Ireland</span></div>
      </div>

      <div className="academy-grid">
        <article className="academy-card wide-academy-card">
          <div className="eyebrow">THIS WEEK</div>
          <h3>Short, varied sessions that convert input into speech</h3>
          <div className="academy-week">
            {DEFAULT_WEEK.map((session) => (
              <div className="academy-session" key={session.day}>
                <span>D{session.day}</span><div><strong>{session.title}</strong><small>{session.primarySkills.join(' • ')} • {session.minutes} min{session.optional ? ' • optional' : ''}</small></div>
              </div>
            ))}
          </div>
        </article>
        <article className="academy-card">
          <div className="eyebrow">PROVISIONAL FOCUS</div>
          <h3>Starting emphasis</h3>
          <div className="skill-chip-list">{profile.english.weakSkills.map((skill) => <span key={skill}>{skill}</span>)}</div>
          <p>These are configured starting areas, not measured weaknesses. Evaluated sessions will replace assumptions with evidence.</p>
        </article>
        <article className="academy-card">
          <div className="eyebrow">PROFESSOR LANGUAGE</div>
          <h3>{profile.english.professorEnglishSharePct}% English starting share</h3>
          <p>{learnerKey === 'viviane' ? 'Portuguese support remains available when needed, but decreases as confidence rises.' : 'Sessions default to English with concise correction and Dublin-relevant professional pressure.'}</p>
        </article>
      </div>

      <div className="section-heading">
        <div><div className="eyebrow">CONVERSATION MODES</div><h2>Practise the situations that actually matter</h2></div><span>Professor modes</span>
      </div>
      <div className="mode-grid">{PROFESSOR_MODES.map((item) => <article className="mode-card" key={item.mode}><strong>{item.mode.replaceAll('-', ' ')}</strong><p>{item.purpose}</p></article>)}</div>
    </section>
  );
}

function RevisionView({ memory, memoryStatus }: { memory: LearningMemorySnapshot | null; memoryStatus: MemoryStatus }) {
  const reviews = memory?.reviews ?? [];
  return (
    <section className="page-stack">
      <div className="section-heading"><div><div className="eyebrow">SPACED REVIEW</div><h2>Review what is most likely to be forgotten</h2></div><span>D+1 • D+7 • D+30 • D+90</span></div>
      {reviews.length === 0 ? <div className="review-list"><EmptyEvidence status={memoryStatus} /></div> : (
        <div className="review-list">
          {reviews.map((review) => (
            <div className="review-row" key={review.id}>
              <span className="review-date">{review.stage}</span>
              <div><strong>{review.label}</strong><span>{review.status === 'due' ? `Due ${shortDate(review.dueDate)}` : `Scheduled ${shortDate(review.dueDate)}`}</span></div>
              <button className="secondary-btn" disabled>{review.status === 'due' ? 'Due' : 'Queued'}</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ErrorBankView({ memory, memoryStatus }: { memory: LearningMemorySnapshot | null; memoryStatus: MemoryStatus }) {
  const errors = memory?.errors ?? [];
  return (
    <section className="page-stack" data-testid="error-bank-view">
      <div className="section-heading"><div><div className="eyebrow">ERROR BANK</div><h2>Recurring mistakes become future curriculum</h2></div><span>{errors.length} active measured patterns</span></div>
      <div className="error-bank-summary"><strong>Mastery rule</strong><span>An error is shown here only after it has been recorded from learner evidence. No sample errors are inserted to make the screen look populated.</span></div>
      {errors.length === 0 ? <div className="adaptive-priority-stack"><EmptyEvidence status={memoryStatus} /></div> : (
        <div className="error-bank-grid">
          {errors.map((error) => (
            <article className="error-bank-card" key={error.id}>
              <div className="error-bank-head"><span className={`error-domain ${error.domain}`}>{error.domain}</span><b>{Math.round(error.confidence)}% confidence</b></div>
              <h3>{error.pattern}</h3>
              <div className="confidence-track"><span style={{ width: `${Math.max(0, Math.min(100, error.confidence))}%` }} /></div>
              <div className="error-meta"><span>Last seen {shortDate(error.lastSeenAt)}</span><span>Next retrieval {shortDate(error.nextReviewAt)}</span></div>
              <button className="secondary-btn" disabled>{error.frequency > 1 ? `${error.frequency} occurrences • queued` : 'Retrieval queued'}</button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function PerformanceView({ memory, memoryStatus }: { memory: LearningMemorySnapshot | null; memoryStatus: MemoryStatus }) {
  const competencyValues = (memory?.competencies ?? []).map((item) => ({
    label: item.name,
    value: item.score,
    detail: `${item.evidenceCount} evidence • ${Math.round(item.confidence)}% confidence`,
  }));
  const latestValues = memory?.latest
    ? scorePairs(memory.latest).map(([label, value]) => ({ label, value, detail: 'Latest evaluated Professor session' }))
    : [];
  const values = competencyValues.length > 0 ? competencyValues : latestValues;

  return (
    <section className="page-stack">
      <div className="section-heading"><div><div className="eyebrow">PERFORMANCE</div><h2>Readiness by capability, not course completion</h2></div><span>{memory?.history.length ?? 0} evaluated session{(memory?.history.length ?? 0) === 1 ? '' : 's'}</span></div>
      {values.length === 0 ? <div className="adaptive-priority-stack"><EmptyEvidence status={memoryStatus} /></div> : (
        <div className="performance-grid">
          {values.map(({ label, value, detail }) => (
            <div className="performance-card" key={label}>
              <span>{label}</span>
              <strong>{Math.round(value)}%</strong>
              <div className="progress-track"><span style={{width:`${Math.max(0, Math.min(100, value))}%`}}/></div>
              <small>{detail}</small>
            </div>
          ))}
        </div>
      )}
      <div className="error-bank-summary"><strong>Interpretation</strong><span>These are measured learning signals, not a validated external employability or exam-readiness benchmark. A formal benchmark layer has not been built yet.</span></div>
    </section>
  );
}

function ProfessorView({ learnerKey, profile, openLesson }: { learnerKey: LearnerKey; profile: LearningProfile; openLesson: (key: TrackKey) => void }) {
  const primaryTrack: TrackKey = learnerKey === 'viviane' ? 'payroll' : 'finance';
  const track = tracks.find((item) => item.key === primaryTrack) ?? tracks[0];
  return (
    <section className="page-stack">
      <div className="professor-hero">
        <div className="professor-orb large">AI</div>
        <div>
          <div className="eyebrow light">PROFESSOR • {profile.displayName.toUpperCase()}</div>
          <h2>Natural voice. Persistent context. Independent evaluation.</h2>
          <p>{profile.professor.style} The deployed live path uses LiveKit + OpenAI Realtime, and completed sessions feed the private learning record used for evaluation and adaptation.</p>
          <div className="professor-focus-list">{profile.professor.technicalFocus.slice(0, 5).map((focus) => <span key={focus}>{focus}</span>)}</div>
          <div className="hero-actions"><button className="primary-btn" onClick={() => openLesson(primaryTrack)}>Open {track.name} lesson</button></div>
        </div>
      </div>
      <div className="wide-card">
        <div><div className="eyebrow">LIVE PROFESSOR</div><h3>{track.lesson}</h3><p>This is the same deployed Professor session boundary used inside the Golden Lesson.</p></div>
        <ProfessorSessionPanel lessonId={track.lessonId} track={track.key} learnerKey={learnerKey} />
      </div>
    </section>
  );
}

function titleForView(view: ViewKey) {
  if (view === 'dashboard') return 'Your learning command centre';
  if (view === 'learn') return 'Learning library';
  if (view === 'english-academy') return 'English Academy';
  if (view === 'revision') return 'Revision queue';
  if (view === 'error-bank') return 'Error Bank';
  if (view === 'performance') return 'Performance & readiness';
  return 'Professor';
}

function subtitleForView(view: ViewKey, profile: LearningProfile) {
  if (view === 'dashboard') return `One adaptive system tuned for ${profile.displayName}, with measured learning evidence kept private to the signed-in account.`;
  if (view === 'learn') return 'Start with three Golden Lessons before scaling the curriculum.';
  if (view === 'english-academy') return 'General English, professional communication and real-world Dublin exposure in one adaptive programme.';
  if (view === 'revision') return 'Only scheduled reviews from real evaluated sessions appear here.';
  if (view === 'error-bank') return 'Only recurring technical and language mistakes recorded from learner evidence appear here.';
  if (view === 'performance') return 'Measured scores are shown without inventing an external readiness benchmark.';
  return 'Premium live tutoring on the deployed LiveKit + OpenAI Realtime path.';
}

export default App;
