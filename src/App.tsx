import { useMemo, useState } from 'react';
import { PremiumAudioPanel } from './components/PremiumAudioPanel';
import { ProfessorSessionPanel } from './components/ProfessorSessionPanel';
import { getLearnerProfile, type LearnerKey, type LearningProfile } from './learners/profiles';
import { DEFAULT_WEEK, PROFESSOR_MODES } from './learning/englishAcademy';
import { rankAdaptivePriorities, type AdaptivePriority, type ReviewSignal } from './learning/adaptiveEngine';
import type { CompetencySignal, ErrorBankItem } from './services/contracts';

type TrackKey = 'finance' | 'payroll' | 'english';
type ViewKey = 'dashboard' | 'learn' | 'revision' | 'performance' | 'professor' | 'error-bank' | 'english-academy';

type Track = {
  key: TrackKey;
  name: string;
  subtitle: string;
  learner: string;
  progress: number;
  readiness: number;
  accent: string;
  lesson: string;
  lessonId?: string;
  focus: string;
};

const tracks: Track[] = [
  {
    key: 'finance',
    name: 'Finance Ireland',
    subtitle: 'Corporate Finance • ACCA • Dublin',
    learner: 'Rafael',
    progress: 18,
    readiness: 74,
    accent: 'FINANCE',
    lesson: 'IFRS 18, Group Reporting & Irish Statutory Accounts',
    lessonId: '15358b9f-01e0-4c3b-afad-07a493b961f5f',
    focus: 'Executive finance judgement, reporting and Dublin readiness',
  },
  {
    key: 'payroll',
    name: 'Irish Payroll',
    subtitle: 'PAYE • USC • PRSI • Revenue',
    learner: 'Viviane',
    progress: 11,
    readiness: 61,
    accent: 'PAYROLL',
    lesson: 'Gross-to-Net: RPN, PAYE, USC & PRSI',
    lessonId: '3ea8155e-a952-4039-87dc-1dd42851f16e',
    focus: 'Irish payroll operations, controls and professional English',
  },
  {
    key: 'english',
    name: 'English Academy',
    subtitle: 'General • Professional • UK + US + Ireland',
    learner: 'Rafael & Viviane',
    progress: 6,
    readiness: 68,
    accent: 'ENGLISH',
    lesson: 'Tell a story naturally: past forms, rhythm & follow-up questions',
    focus: 'Everyday fluency, listening, grammar, pronunciation and work English',
  },
];

const lessonTabs = ['Learn', 'Audio', 'English', 'Practice', 'Visual', 'Case', 'Test', 'Sources', 'Professor'];

function isoOffset(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function intelligenceFor(learnerKey: LearnerKey): {
  competencies: CompetencySignal[];
  errors: ErrorBankItem[];
  reviews: ReviewSignal[];
} {
  if (learnerKey === 'viviane') {
    return {
      competencies: [
        { competencyId: 'payroll-prsi', label: 'PRSI categories & treatment', score: 58, priority: true },
        { competencyId: 'payroll-rpn', label: 'RPN interpretation', score: 67, priority: true },
        { competencyId: 'english-listening', label: 'Listening under natural speed', score: 63, priority: true },
        { competencyId: 'english-writing', label: 'Professional writing', score: 72, priority: false },
      ],
      errors: [
        { id: 'viv-err-1', learnerId: 'viviane', domain: 'grammar', pattern: 'Past simple vs present perfect in work updates', confidence: 46, lastSeenAt: isoOffset(-2), nextReviewAt: isoOffset(-1) },
        { id: 'viv-err-2', learnerId: 'viviane', domain: 'pronunciation', pattern: 'Final consonants in payroll vocabulary', confidence: 52, lastSeenAt: isoOffset(-3), nextReviewAt: isoOffset(0) },
        { id: 'viv-err-3', learnerId: 'viviane', domain: 'technical', pattern: 'Distinguish employee PRSI class before calculation', confidence: 61, lastSeenAt: isoOffset(-5), nextReviewAt: isoOffset(1) },
      ],
      reviews: [
        { id: 'viv-rev-1', label: 'RPN and tax credits', dueAt: isoOffset(0), interval: 'D+7', score: 64, competencyId: 'payroll-rpn' },
        { id: 'viv-rev-2', label: 'Explaining a payroll variance in English', dueAt: isoOffset(1), interval: 'D+1', score: 68 },
      ],
    };
  }

  return {
    competencies: [
      { competencyId: 'finance-judgement', label: 'Executive finance judgement', score: 68, priority: true },
      { competencyId: 'finance-recall', label: 'Technical recall strength', score: 64, priority: true },
      { competencyId: 'english-fluency', label: 'Spoken fluency under pressure', score: 66, priority: true },
      { competencyId: 'business-partnering', label: 'Business partnering narrative', score: 78, priority: false },
    ],
    errors: [
      { id: 'raf-err-1', learnerId: 'rafael', domain: 'technical', pattern: 'Connect EBITDA movement to working-capital cash impact', confidence: 57, lastSeenAt: isoOffset(-2), nextReviewAt: isoOffset(-1) },
      { id: 'raf-err-2', learnerId: 'rafael', domain: 'fluency', pattern: 'Overlong answers before stating the executive conclusion', confidence: 62, lastSeenAt: isoOffset(-4), nextReviewAt: isoOffset(0) },
      { id: 'raf-err-3', learnerId: 'rafael', domain: 'pronunciation', pattern: 'Stress in statutory / reconciliation / subsidiary', confidence: 69, lastSeenAt: isoOffset(-8), nextReviewAt: isoOffset(1) },
    ],
    reviews: [
      { id: 'raf-rev-1', label: 'Working-capital narrative', dueAt: isoOffset(0), interval: 'D+1', score: 66, competencyId: 'finance-judgement' },
      { id: 'raf-rev-2', label: 'IFRS 18 presentation logic', dueAt: isoOffset(1), interval: 'D+7', score: 73, competencyId: 'finance-recall' },
    ],
  };
}

function App() {
  const [view, setView] = useState<ViewKey>('dashboard');
  const [trackKey, setTrackKey] = useState<TrackKey>('finance');
  const [lessonOpen, setLessonOpen] = useState(false);
  const [lessonTab, setLessonTab] = useState('Learn');
  const [learnerKey, setLearnerKey] = useState<LearnerKey>('rafael');

  const profile = useMemo(() => getLearnerProfile(learnerKey), [learnerKey]);
  const activeTrack = useMemo(() => tracks.find((t) => t.key === trackKey) ?? tracks[0], [trackKey]);

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
          <span>V1 frozen and protected</span>
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
            <button className="ghost-btn">Today</button>
            <button className="round-btn" aria-label="Notifications">•</button>
          </div>
        </header>

        {lessonOpen ? (
          <LessonView track={activeTrack} learnerKey={learnerKey} activeTab={lessonTab} setActiveTab={setLessonTab} close={() => { setLessonOpen(false); setView('dashboard'); }} />
        ) : view === 'dashboard' ? (
          <Dashboard learnerKey={learnerKey} profile={profile} openLesson={openLesson} openView={setView} />
        ) : view === 'learn' ? (
          <LearningLibrary learnerKey={learnerKey} openLesson={openLesson} />
        ) : view === 'english-academy' ? (
          <EnglishAcademyView profile={profile} learnerKey={learnerKey} openLesson={() => openLesson('english')} />
        ) : view === 'revision' ? (
          <RevisionView learnerKey={learnerKey} />
        ) : view === 'error-bank' ? (
          <ErrorBankView learnerKey={learnerKey} />
        ) : view === 'performance' ? (
          <PerformanceView learnerKey={learnerKey} />
        ) : (
          <ProfessorView learnerKey={learnerKey} profile={profile} />
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

function Dashboard({ learnerKey, profile, openLesson, openView }: { learnerKey: LearnerKey; profile: LearningProfile; openLesson: (key: TrackKey) => void; openView: (view: ViewKey) => void }) {
  const intelligence = useMemo(() => intelligenceFor(learnerKey), [learnerKey]);
  const priorities = useMemo(() => rankAdaptivePriorities({ ...intelligence, now: new Date(), limit: 4 }), [intelligence]);
  const primaryTrack: TrackKey = learnerKey === 'viviane' ? 'payroll' : 'finance';
  const primaryLabel = learnerKey === 'viviane' ? 'Continue Payroll' : 'Continue Finance';
  const priorityCount = priorities.filter((item) => item.score >= 50).length;

  return (
    <section className="content-grid dashboard-grid">
      <div className="hero-panel">
        <div className="hero-kicker">TODAY'S FOCUS • {profile.displayName.toUpperCase()}</div>
        <h2>Build capability, not just knowledge.</h2>
        <p>The next action is selected from competency scores, recurring errors and spaced-review timing — not from a fixed chapter list.</p>
        <div className="hero-actions">
          <button className="primary-btn" onClick={() => openLesson(primaryTrack)}>{primaryLabel}</button>
          <button className="secondary-btn" onClick={() => openLesson('english')}>Start English practice</button>
        </div>
        <div className="union-accent" aria-hidden="true" />
      </div>

      <div className="metric-card">
        <div className="metric-label">REVIEWS DUE</div>
        <div className="metric-value">{intelligence.reviews.length}</div>
        <div className="metric-foot danger-text">{priorityCount} high priority signals</div>
      </div>
      <div className="metric-card">
        <div className="metric-label">ENGLISH PATH</div>
        <div className="metric-value metric-small">{profile.english.cefr}</div>
        <div className="metric-foot">target {profile.english.targetCefr}</div>
      </div>
      <div className="metric-card">
        <div className="metric-label">PROFESSOR ENGLISH</div>
        <div className="metric-value">{profile.english.professorEnglishSharePct}%</div>
        <div className="metric-foot">adaptive conversation share</div>
      </div>

      <div className="section-heading full-span">
        <div>
          <div className="eyebrow">ADAPTIVE CURRICULUM</div>
          <h2>Your next actions are ranked by learning need</h2>
        </div>
        <button className="text-action" onClick={() => openView('error-bank')}>Open Error Bank →</button>
      </div>

      <div className="adaptive-priority-stack full-span" data-testid="adaptive-priority-stack">
        {priorities.map((priority, index) => <PriorityCard key={priority.key} priority={priority} rank={index + 1} />)}
      </div>

      <div className="section-heading full-span">
        <div>
          <div className="eyebrow">YOUR PROGRAMMES</div>
          <h2>Three connected learning tracks</h2>
        </div>
        <span>Adaptive • D+1 / D+7 / D+30 / D+90</span>
      </div>

      {tracks.map((track) => (
        <article className={`track-card ${track.key === primaryTrack ? 'primary-track-card' : ''}`} key={track.key}>
          <div className="track-card-head">
            <span className={`track-badge ${track.key}`}>{track.accent}</span>
            <span className="readiness-pill">{track.readiness}% ready</span>
          </div>
          <h3>{track.name}</h3>
          <p className="track-subtitle">{track.subtitle}</p>
          <p className="next-label">NEXT GOLDEN LESSON</p>
          <strong className="lesson-name">{track.lesson}</strong>
          <div className="progress-row">
            <div className="progress-track"><span style={{ width: `${track.progress}%` }} /></div>
            <span>{track.progress}%</span>
          </div>
          <button className="card-action" onClick={() => openLesson(track.key)}>Continue learning →</button>
        </article>
      ))}

      <div className="wide-card full-span">
        <div>
          <div className="eyebrow">LEARNING LOOP</div>
          <h3>Every result changes what happens next.</h3>
          <p>Professor conversations, tests and cases feed independent evaluation. Weak competencies and recurring mistakes return through the Error Bank and spaced reviews.</p>
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

function LessonView({ track, learnerKey, activeTab, setActiveTab, close }: { track: Track; learnerKey: LearnerKey; activeTab: string; setActiveTab: (tab: string) => void; close: () => void }) {
  return (
    <section className="lesson-shell" data-testid="lesson-shell">
      <div className="lesson-toolbar">
        <button className="back-btn" onClick={close}>← Dashboard</button>
        <div className="lesson-progress"><span>Golden Lesson</span><div className="progress-track"><span style={{ width: '32%' }} /></div><b>32%</b></div>
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
          <div className="eyebrow">LEARNING SIGNALS</div>
          <h3>What this lesson is training</h3>
          <Signal label="Technical accuracy" value={78} />
          <Signal label="Judgement" value={69} />
          <Signal label="Professional English" value={72} />
          <Signal label="Recall strength" value={64} />
          <div className="priority-note"><strong>Priority detected</strong><span>Judgement and recall will return in D+1 and D+7 reviews.</span></div>
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
  return <div className="reading-copy"><h2>Quick retrieval</h2><p className="lead">Answer before seeing the model reasoning.</p><div className="question-box"><strong>{track.key === 'english' ? 'Tell the same story in 30 seconds without using “and then” more than once.' : 'What would you investigate first, and why?'}</strong><textarea placeholder="Write your answer here…" /><button className="primary-btn">Check reasoning</button></div></div>;
}

function VisualPanel() {
  return <div className="reading-copy"><h2>Visual challenge</h2><p className="lead">Interpret the signal, identify the issue and explain your conclusion.</p><div className="visual-demo"><div className="visual-bar a"/><div className="visual-bar b"/><div className="visual-bar c"/><div className="visual-bar d"/><div className="visual-bar e"/></div><p>Which movement requires management attention first? Explain the business implication.</p></div>;
}

function CasePanel({ track }: { track: Track }) {
  return <div className="reading-copy"><h2>Manager case</h2><div className="case-box"><span>SCENARIO</span><p>{track.key === 'payroll' ? 'An employee says net pay unexpectedly fell after a payroll change. Revenue data, employee setup and deductions all need to be checked before responding.' : track.key === 'english' ? 'You have moved to Dublin and need to call a letting agent because the heating has stopped. Explain the issue clearly, ask what happens next and respond to follow-up questions.' : 'Month-end reporting is complete, but working capital deteriorated while EBITDA improved. The Regional CFO asks for a concise explanation and next actions.'}</p></div><textarea className="case-answer" placeholder="Build your response…" /><button className="primary-btn">Submit for independent evaluation</button></div>;
}

function TestPanel() {
  return <div className="reading-copy"><h2>Checkpoint</h2><p className="lead">A short assessment feeds the competency engine.</p><div className="question-box"><strong>Which answer demonstrates the strongest professional judgement?</strong>{['State the rule only.', 'State the rule and repeat the data.', 'Explain the conclusion, evidence, risk and next action.', 'Escalate immediately without analysis.'].map((x, i) => <label className="option-row" key={x}><input type="radio" name="q1"/><span>{String.fromCharCode(65+i)}. {x}</span></label>)}<button className="primary-btn">Submit answer</button></div></div>;
}

function SourcesPanel() {
  return <div className="reading-copy"><h2>Sources & freshness</h2><p className="lead">Current Irish rules must be revalidated as the programme approaches 2028/29.</p><div className="source-row"><strong>Primary source</strong><span>Official / professional reference placeholder</span></div><div className="source-row"><strong>Freshness status</strong><span className="freshness">Review before production content scale</span></div></div>;
}

function InlineProfessorPanel({ learnerKey, track }: { learnerKey: LearnerKey; track: Track }) {
  return <div className="reading-copy"><h2>Professor</h2><p className="lead">Live voice tutoring runs in its own resilient boundary using LiveKit + OpenAI Realtime.</p><ProfessorSessionPanel lessonId={track.lessonId} track={track.key} learnerKey={learnerKey} /><div className="callout"><strong>Safety by design</strong><span>No raw learner voice stored by default. Session evaluation is handled independently after the conversation.</span></div></div>;
}

function Signal({ label, value }: { label: string; value: number }) {
  return <div className="signal-row"><div><span>{label}</span><b>{value}%</b></div><div className="progress-track"><span style={{ width: `${value}%` }} /></div></div>;
}

function EnglishAcademyView({ profile, learnerKey, openLesson }: { profile: LearningProfile; learnerKey: LearnerKey; openLesson: () => void }) {
  return (
    <section className="page-stack" data-testid="english-academy-view">
      <div className="academy-hero">
        <div>
          <div className="eyebrow light">ENGLISH ACADEMY • {profile.displayName.toUpperCase()}</div>
          <h2>General English first. Professional confidence built on top.</h2>
          <p>British and American English are both accepted, with deliberate Irish exposure for real life in Dublin. The programme adapts to the learner rather than forcing one fixed textbook path.</p>
          <div className="hero-actions"><button className="primary-btn" onClick={openLesson}>Open English Golden Lesson</button><span className="academy-level">{profile.english.cefr} now • {profile.english.targetCefr} target</span></div>
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
          <div className="eyebrow">CURRENT WEAK SKILLS</div>
          <h3>Adaptive focus</h3>
          <div className="skill-chip-list">{profile.english.weakSkills.map((skill) => <span key={skill}>{skill}</span>)}</div>
          <p>These skills receive more retrieval, Professor time and Error Bank resurfacing until evidence improves.</p>
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

function RevisionView({ learnerKey }: { learnerKey: LearnerKey }) {
  const intelligence = intelligenceFor(learnerKey);
  return <section className="page-stack"><div className="section-heading"><div><div className="eyebrow">SPACED REVIEW</div><h2>Review what is most likely to be forgotten</h2></div><span>D+1 • D+7 • D+30 • D+90</span></div><div className="review-list">{intelligence.reviews.map((review) => <div className="review-row" key={review.id}><span className="review-date">{review.interval}</span><div><strong>{review.label}</strong><span>{review.score != null && review.score < 70 ? 'Below 70% • priority' : 'Scheduled retrieval'}</span></div><button className="secondary-btn">Review</button></div>)}</div></section>;
}

function ErrorBankView({ learnerKey }: { learnerKey: LearnerKey }) {
  const { errors } = intelligenceFor(learnerKey);
  return (
    <section className="page-stack" data-testid="error-bank-view">
      <div className="section-heading"><div><div className="eyebrow">ERROR BANK</div><h2>Recurring mistakes become future curriculum</h2></div><span>{errors.length} active patterns</span></div>
      <div className="error-bank-summary"><strong>Mastery rule</strong><span>An error stays active until repeated successful retrieval raises confidence. Mastered patterns move to longer maintenance intervals instead of disappearing forever.</span></div>
      <div className="error-bank-grid">
        {errors.map((error) => (
          <article className="error-bank-card" key={error.id}>
            <div className="error-bank-head"><span className={`error-domain ${error.domain}`}>{error.domain}</span><b>{error.confidence}% confidence</b></div>
            <h3>{error.pattern}</h3>
            <div className="confidence-track"><span style={{ width: `${error.confidence}%` }} /></div>
            <div className="error-meta"><span>Last seen {new Date(error.lastSeenAt).toLocaleDateString('en-GB')}</span><span>Next retrieval {new Date(error.nextReviewAt).toLocaleDateString('en-GB')}</span></div>
            <button className="secondary-btn">Start retrieval</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function PerformanceView({ learnerKey }: { learnerKey: LearnerKey }) {
  const values: Array<[string, number]> = learnerKey === 'viviane'
    ? [['Payroll Accuracy',72],['PRSI / PAYE Judgement',61],['Professional English',65],['Listening',63],['Recall Strength',69],['Interview Readiness',58]]
    : [['Technical Accuracy',81],['Judgement',68],['Professional English',73],['Fluency',66],['Recall Strength',70],['Interview Readiness',62]];
  return <section className="page-stack"><div className="section-heading"><div><div className="eyebrow">PERFORMANCE</div><h2>Readiness by capability, not course completion</h2></div><span>Adaptive benchmark</span></div><div className="performance-grid">{values.map(([label,val]) => <div className="performance-card" key={label}><span>{label}</span><strong>{val}%</strong><div className="progress-track"><span style={{width:`${val}%`}}/></div><small>{val<70?'Priority next cycle':'On track'}</small></div>)}</div></section>;
}

function ProfessorView({ learnerKey, profile }: { learnerKey: LearnerKey; profile: LearningProfile }) {
  const primaryTrack: TrackKey = learnerKey === 'viviane' ? 'payroll' : 'finance';
  return <section className="page-stack"><div className="professor-hero"><div className="professor-orb large">AI</div><div><div className="eyebrow light">PROFESSOR LAB • {profile.displayName.toUpperCase()}</div><h2>Natural voice. Persistent context. Independent evaluation.</h2><p>{profile.professor.style} The live session boundary uses LiveKit + OpenAI Realtime, while Supabase receives only the learning record required for evaluation and adaptation.</p><div className="professor-focus-list">{profile.professor.technicalFocus.slice(0, 5).map((focus) => <span key={focus}>{focus}</span>)}</div><div className="hero-actions"><button className="primary-btn" onClick={() => void primaryTrack}>Open a Golden Lesson to start</button><button className="secondary-dark-btn">LiveKit integration staged</button></div></div></div></section>;
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
  if (view === 'dashboard') return `One adaptive system tuned for ${profile.displayName}, with English Academy connected to the technical track.`;
  if (view === 'learn') return 'Start with three Golden Lessons before scaling the curriculum.';
  if (view === 'english-academy') return 'General English, professional communication and real-world Dublin exposure in one adaptive programme.';
  if (view === 'revision') return 'The system prioritises what you are most likely to forget or misunderstand.';
  if (view === 'error-bank') return 'Recurring technical and language mistakes are converted into deliberate future practice.';
  if (view === 'performance') return 'Scores below 70% become an explicit learning priority.';
  return 'Premium live tutoring designed as a separate, resilient feature boundary.';
}

export default App;
