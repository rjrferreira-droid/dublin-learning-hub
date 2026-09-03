import { useMemo, useState } from 'react';
import { PremiumAudioPanel } from './components/PremiumAudioPanel';

type TrackKey = 'finance' | 'payroll' | 'english';
type ViewKey = 'dashboard' | 'learn' | 'revision' | 'performance' | 'professor';

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

function App() {
  const [view, setView] = useState<ViewKey>('dashboard');
  const [trackKey, setTrackKey] = useState<TrackKey>('finance');
  const [lessonOpen, setLessonOpen] = useState(false);
  const [lessonTab, setLessonTab] = useState('Learn');

  const activeTrack = useMemo(() => tracks.find((t) => t.key === trackKey) ?? tracks[0], [trackKey]);

  const openLesson = (key: TrackKey) => {
    setTrackKey(key);
    setLessonTab('Learn');
    setLessonOpen(true);
    setView('learn');
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

        <div className="profile-card">
          <div className="avatar">RF</div>
          <div>
            <strong>Rafael Ferreira</strong>
            <span>Dublin 2028/29</span>
          </div>
          <div className="status-dot" title="Synced" />
        </div>

        <nav className="nav-stack">
          <NavButton label="Dashboard" icon="⌂" active={view === 'dashboard'} onClick={() => { setView('dashboard'); setLessonOpen(false); }} />
          <NavButton label="Learning" icon="▤" active={view === 'learn'} onClick={() => { setView('learn'); setLessonOpen(false); }} />
          <NavButton label="Revision" icon="↻" active={view === 'revision'} onClick={() => { setView('revision'); setLessonOpen(false); }} />
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
            <div className="eyebrow">DUBLIN 2028/29</div>
            <h1>{lessonOpen ? activeTrack.lesson : titleForView(view)}</h1>
            <p>{lessonOpen ? activeTrack.focus : subtitleForView(view)}</p>
          </div>
          <div className="top-actions">
            <button className="ghost-btn">Today</button>
            <button className="round-btn" aria-label="Notifications">•</button>
          </div>
        </header>

        {lessonOpen ? (
          <LessonView track={activeTrack} activeTab={lessonTab} setActiveTab={setLessonTab} close={() => { setLessonOpen(false); setView('dashboard'); }} />
        ) : view === 'dashboard' ? (
          <Dashboard openLesson={openLesson} />
        ) : view === 'learn' ? (
          <LearningLibrary openLesson={openLesson} />
        ) : view === 'revision' ? (
          <RevisionView />
        ) : view === 'performance' ? (
          <PerformanceView />
        ) : (
          <ProfessorView />
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

function Dashboard({ openLesson }: { openLesson: (key: TrackKey) => void }) {
  return (
    <section className="content-grid dashboard-grid">
      <div className="hero-panel">
        <div className="hero-kicker">TODAY'S FOCUS</div>
        <h2>Build capability, not just knowledge.</h2>
        <p>Your learning engine prioritises weak areas, active recall and practical application before moving forward.</p>
        <div className="hero-actions">
          <button className="primary-btn" onClick={() => openLesson('finance')}>Continue Finance</button>
          <button className="secondary-btn" onClick={() => openLesson('english')}>Start English practice</button>
        </div>
        <div className="union-accent" aria-hidden="true" />
      </div>

      <div className="metric-card">
        <div className="metric-label">REVIEWS DUE</div>
        <div className="metric-value">7</div>
        <div className="metric-foot danger-text">3 high priority</div>
      </div>
      <div className="metric-card">
        <div className="metric-label">WEEKLY RHYTHM</div>
        <div className="metric-value">4/5</div>
        <div className="metric-foot">days completed</div>
      </div>
      <div className="metric-card">
        <div className="metric-label">READINESS</div>
        <div className="metric-value">71%</div>
        <div className="metric-foot">across active tracks</div>
      </div>

      <div className="section-heading full-span">
        <div>
          <div className="eyebrow">YOUR PROGRAMMES</div>
          <h2>Three connected learning tracks</h2>
        </div>
        <span>Adaptive • D+1 / D+7 / D+30 / D+90</span>
      </div>

      {tracks.map((track) => (
        <article className="track-card" key={track.key}>
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
          <div className="eyebrow">ADAPTIVE ENGINE</div>
          <h3>Weak areas are automatically brought back.</h3>
          <p>Technical errors, English mistakes and confidence gaps feed the Error Bank and future review queue.</p>
        </div>
        <div className="engine-flow">
          <span>Tutor</span><b>→</b><span>Evaluator</span><b>→</b><span>Curriculum Engine</span><b>→</b><span>Next action</span>
        </div>
      </div>
    </section>
  );
}

function LearningLibrary({ openLesson }: { openLesson: (key: TrackKey) => void }) {
  return (
    <section className="page-stack">
      <div className="section-heading">
        <div><div className="eyebrow">GOLDEN LESSONS</div><h2>Validate the full experience before scaling content</h2></div>
        <span>3 lessons • end-to-end quality gate</span>
      </div>
      <div className="library-grid">
        {tracks.map((track, index) => (
          <article className="lesson-library-card" key={track.key}>
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

function LessonView({ track, activeTab, setActiveTab, close }: { track: Track; activeTab: string; setActiveTab: (tab: string) => void; close: () => void }) {
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
          {activeTab === 'Professor' && <InlineProfessorPanel track={track} />}
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

function InlineProfessorPanel({ track }: { track: Track }) {
  return <div className="reading-copy"><h2>Professor</h2><p className="lead">Live voice tutoring will run in its own boundary using LiveKit + OpenAI Realtime.</p><div className="professor-card"><div className="professor-orb">AI</div><div><strong>Professor ready for integration</strong><span>{track.key === 'english' ? 'Natural UK/US conversation with Irish exposure.' : 'Technical follow-up questions + professional English.'}</span></div><button className="primary-btn">Start session</button></div><div className="callout"><strong>Safety by design</strong><span>No raw learner voice stored by default. Session evaluation is handled independently after the conversation.</span></div></div>;
}

function Signal({ label, value }: { label: string; value: number }) {
  return <div className="signal-row"><div><span>{label}</span><b>{value}%</b></div><div className="progress-track"><span style={{ width: `${value}%` }} /></div></div>;
}

function RevisionView() {
  return <section className="page-stack"><div className="section-heading"><div><div className="eyebrow">SPACED REVIEW</div><h2>Review what is most likely to be forgotten</h2></div><span>D+1 • D+7 • D+30 • D+90</span></div><div className="review-list">{[['D+1','Working capital narrative','High priority'],['D+7','PRSI categories','Below 70%'],['D+30','Present perfect: for / since','Recurring error'],['D+90','Executive summary structure','Maintenance']].map(([d,t,s]) => <div className="review-row" key={t}><span className="review-date">{d}</span><div><strong>{t}</strong><span>{s}</span></div><button className="secondary-btn">Review</button></div>)}</div></section>;
}

function PerformanceView() {
  return <section className="page-stack"><div className="section-heading"><div><div className="eyebrow">PERFORMANCE</div><h2>Readiness by capability, not course completion</h2></div><span>Adaptive benchmark</span></div><div className="performance-grid">{[['Technical Accuracy',81],['Judgement',68],['Professional English',73],['Fluency',66],['Recall Strength',70],['Interview Readiness',62]].map(([label,val]) => <div className="performance-card" key={String(label)}><span>{label}</span><strong>{val}%</strong><div className="progress-track"><span style={{width:`${val}%`}}/></div><small>{Number(val)<70?'Priority next cycle':'On track'}</small></div>)}</div></section>;
}

function ProfessorView() {
  return <section className="page-stack"><div className="professor-hero"><div className="professor-orb large">AI</div><div><div className="eyebrow light">PROFESSOR LAB</div><h2>Natural voice. Persistent context. Independent evaluation.</h2><p>The Professor is intentionally isolated from core navigation. LiveKit will manage the voice session; OpenAI will manage intelligence; Supabase will store only the required learning record.</p><div className="hero-actions"><button className="primary-btn">Voice integration pending</button><button className="secondary-dark-btn">View architecture</button></div></div></div></section>;
}

function titleForView(view: ViewKey) {
  if (view === 'dashboard') return 'Your learning command centre';
  if (view === 'learn') return 'Learning library';
  if (view === 'revision') return 'Revision queue';
  if (view === 'performance') return 'Performance & readiness';
  return 'Professor';
}

function subtitleForView(view: ViewKey) {
  if (view === 'dashboard') return 'One adaptive system for Finance, Irish Payroll and English.';
  if (view === 'learn') return 'Start with three Golden Lessons before scaling the curriculum.';
  if (view === 'revision') return 'The system prioritises what you are most likely to forget or misunderstand.';
  if (view === 'performance') return 'Scores below 70% become an explicit learning priority.';
  return 'Premium live tutoring designed as a separate, resilient feature boundary.';
}

export default App;