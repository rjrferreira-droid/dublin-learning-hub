import {LessonReadinessCheck} from './components/LessonReadinessCheck';
import {PreviewConfigurationCheck} from './components/PreviewConfigurationCheck';
import {PreviewSessionRecovery} from './components/PreviewSessionRecovery';
import {PreviewRecoveryDiscovery} from './components/PreviewRecoveryDiscovery';
import {isP1Slug} from './learning/p1RuntimeRegistry';
import {isRemainingWrittenSlug} from './learning/remainingWrittenRegistry';
import {isSequence4Slug} from './learning/sequence4Registry';
import {WORKSHOP_CASES} from './learning/appliedPractice';
import {loadPublishedCurriculumCatalog,type CatalogLesson} from './services/curriculumCatalog';
import {lessonsForTrack,chooseNextPublishedLesson} from './learning/curriculumCatalogCore';
import {LOCAL_MODEL_LESSONS} from './learning/localModelLessonRegistry';
import {curriculumPreviewRuntimeEnabled} from './config/curriculumPreview';
import {localEnglishLessonsForLearner} from './learning/localEnglishCatalogForLearner';
import {buildLocalReviewSchedule,completeLocalLesson,completeLocalReview,lastOpenedLocalLessonId,localLessonAfter,mergeLocalStudyProgress,parseLocalStudyProgress,readLocalStudyProgress,recordLocalLessonOpened,summarizeLocalCourse,writeLocalStudyProgress,type LocalReviewItem,type LocalReviewStage,type LocalStudyProgress} from './learning/localStudyProgress';
import {isSequence3Slug} from './learning/sequence3Registry';
import {p1SlugFor} from './learning/p1RuntimeModules';
import { LessonStudyPanel } from './components/LessonStudyPanel';
import {LocalMockExamView} from './components/LocalMockExamView';
import {LessonProfessorWorkspace} from './components/LessonProfessorWorkspace';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLearnerSession } from './auth/LearnerSession';
import { canUseLearnerActions } from './auth/identity';
import { PremiumAudioPanel } from './components/PremiumAudioPanel';
import { ProfessorSessionPanel } from './components/DeferredProfessorPanel';
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
import {ACCOUNT_STUDY_NAMESPACES,loadAccountStudyState,saveAccountStudyState} from './services/accountStudyState';
import { isTrackVisible, primaryVisibleTrack } from './config/presentation';

type TrackKey = 'finance' | 'payroll' | 'english';
type ViewKey = 'dashboard' | 'learn' | 'mock-exams' | 'revision' | 'performance' | 'professor' | 'error-bank' | 'english-academy';

type Track = {
  key: TrackKey;
  name: string;
  subtitle: string;
  learner: string;
  accent: string;
  lesson: string;
  lessonId: string;
  lessonSlug: string;
  focus: string;
  origin?: CatalogLesson['origin'];
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
    lessonSlug: 'ifrs-18-group-reporting-irish-statutory',
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
    lessonSlug: 'gross-to-net-rpn-paye-usc-prsi',
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
    lessonSlug: 'story-past-forms-rhythm-follow-up',
    focus: 'Everyday fluency, listening, grammar, pronunciation and work English',
  },
];

const lessonTabs = ['Learn', 'Audio', 'English', 'Practice', 'Visual', 'Case', 'Test', 'Sources', 'Professor'];
const visibleTracks = tracks.filter(track => isTrackVisible(track.key));
const reviewIntervals = new Set(['D+1', 'D+7', 'D+30', 'D+90']);
const errorDomains = new Set(['technical', 'grammar', 'vocabulary', 'pronunciation', 'fluency', 'register']);

type MemoryStatus = 'loading' | 'ready' | 'empty' | 'unavailable' | 'other-profile';
type StudySyncStatus = 'loading' | 'synced' | 'saving' | 'local-fallback';

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

function localProgressStorage(){try{return typeof window==='undefined'?null:window.localStorage;}catch{return null;}}

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
    diagnosticConfidence: item.diagnosticConfidence,
    masteryConfidence: item.masteryConfidence,
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
  const account = useLearnerSession();
  const memoryRequest = useRef(0);
  const [view, setView] = useState<ViewKey>('dashboard');
  const [trackKey, setTrackKey] = useState<TrackKey>(primaryVisibleTrack(account.learnerKey));
  const [lessonOpen, setLessonOpen] = useState(false);
  const [lessonTab, setLessonTab] = useState('Learn');
  const [learnerKey, setLearnerKey] = useState<LearnerKey>(account.learnerKey);
  const accountLearnerKey = account.learnerKey;
  const [memory, setMemory] = useState<LearningMemorySnapshot | null>(null);
  const [memoryLoading, setMemoryLoading] = useState(true);
  const [memoryError, setMemoryError] = useState(false);
  const [catalog,setCatalog]=useState<CatalogLesson[]>([]);
  const [catalogUnavailable,setCatalogUnavailable]=useState(false);
  const [selectedCatalogLesson,setSelectedCatalogLesson]=useState<CatalogLesson|null>(null);
  const [localProgress,setLocalProgress]=useState<LocalStudyProgress>(()=>readLocalStudyProgress(localProgressStorage(),account.userId));
  const localProgressRef=useRef(localProgress);
  const studySaveRevision=useRef(0);
  const [studySyncStatus,setStudySyncStatus]=useState<StudySyncStatus>('loading');
  const [activeLocalReview,setActiveLocalReview]=useState<{lessonId:string;stage:LocalReviewStage}|null>(null);

  const profile = useMemo(() => getLearnerProfile(learnerKey), [learnerKey]);
  const curriculumPreview=curriculumPreviewRuntimeEnabled;
  const supportedCatalog=useMemo(()=>{
    const published=catalog.filter((lesson)=>{const base=tracks.find(t=>t.key===lesson.track);return !!base&&(lesson.id===base.lessonId||lesson.slug===p1SlugFor(lesson.track)||isSequence3Slug(lesson.track,lesson.slug)||isSequence4Slug(lesson.track,lesson.slug)||isRemainingWrittenSlug(lesson.track,lesson.slug));});
    if(!curriculumPreview)return published;
    const local=[...LOCAL_MODEL_LESSONS,...localEnglishLessonsForLearner(learnerKey)];
    const localKeys=new Set(local.map(lesson=>`${lesson.track}:${lesson.slug}`));
    return [...local,...published.filter(lesson=>!localKeys.has(`${lesson.track}:${lesson.slug}`))];
  },[catalog,curriculumPreview,learnerKey]);
  const activeTrack = useMemo(() => {
    const base=tracks.find((t)=>t.key===trackKey)??tracks[0];
    const selected=selectedCatalogLesson?.track===trackKey?selectedCatalogLesson:null;
    return selected?{...base,lesson:selected.title,lessonId:selected.id,lessonSlug:selected.slug,focus:selected.subtitle??base.focus,origin:selected.origin}:base;
  },[trackKey,selectedCatalogLesson]);
  const nextLocalLesson=useMemo(()=>selectedCatalogLesson?.origin==='local-model'?localLessonAfter(supportedCatalog,selectedCatalogLesson.id):null,[selectedCatalogLesson,supportedCatalog]);

  const refreshMemory = useCallback(async () => {
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

  const persistStudyProgress=useCallback((next:LocalStudyProgress)=>{
    localProgressRef.current=next;setLocalProgress(next);writeLocalStudyProgress(localProgressStorage(),next,account.userId);
    const revision=++studySaveRevision.current;setStudySyncStatus('saving');
    void saveAccountStudyState(account.userId,ACCOUNT_STUDY_NAMESPACES.curriculum,next).then(()=>{if(revision===studySaveRevision.current)setStudySyncStatus('synced');}).catch(()=>{if(revision===studySaveRevision.current)setStudySyncStatus('local-fallback');});
  },[account.userId]);

  useEffect(()=>{
    let cancelled=false;
    const local=readLocalStudyProgress(localProgressStorage(),account.userId);localProgressRef.current=local;setLocalProgress(local);setActiveLocalReview(null);setStudySyncStatus('loading');
    if(!curriculumPreview){setStudySyncStatus('synced');return()=>{cancelled=true;studySaveRevision.current++;};}
    void loadAccountStudyState(account.userId,ACCOUNT_STUDY_NAMESPACES.curriculum).then(payload=>{
      if(cancelled)return;
      const remote=parseLocalStudyProgress(payload),merged=mergeLocalStudyProgress(localProgressRef.current,remote);
      localProgressRef.current=merged;setLocalProgress(merged);writeLocalStudyProgress(localProgressStorage(),merged,account.userId);
      if(JSON.stringify(merged)!==JSON.stringify(remote))persistStudyProgress(merged);else setStudySyncStatus('synced');
    }).catch(()=>{if(!cancelled)setStudySyncStatus('local-fallback');});
    return()=>{cancelled=true;studySaveRevision.current++;};
  },[account.userId,curriculumPreview,persistStudyProgress]);

  useEffect(()=>{
    const controller=new AbortController();setCatalogUnavailable(false);
    void loadPublishedCurriculumCatalog(controller.signal).then(setCatalog).catch(()=>{if(!controller.signal.aborted){setCatalog([]);setCatalogUnavailable(true);}});
    return ()=>controller.abort();
  },[account.userId]);

  const privateDataVisible = learnerKey === accountLearnerKey;
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

  const openLesson = (key: TrackKey,lesson?:CatalogLesson,options?:{tab?:string;reviewStage?:LocalReviewStage}) => {
    const measured=new Set([...(visibleMemory?.history??[]).map(x=>x.lessonId),...Object.keys(localProgress.completed)]);
    const resolved=lesson??chooseNextPublishedLesson(supportedCatalog,key,measured);
    if(resolved?.origin==='local-model')persistStudyProgress(recordLocalLessonOpened(localProgressRef.current,resolved.id,resolved.track));
    setActiveLocalReview(resolved?.origin==='local-model'&&options?.reviewStage?{lessonId:resolved.id,stage:options.reviewStage}:null);
    setSelectedCatalogLesson(resolved??null);
    setTrackKey(key);
    setLessonTab(options?.tab??'Learn');
    setLessonOpen(true);
    setView('learn');
  };

  const completeCurrentLocalLesson=(correct:number,total:number)=>{
    if(selectedCatalogLesson?.origin!=='local-model')return;
    const current=localProgressRef.current,next=activeLocalReview?.lessonId===selectedCatalogLesson.id?completeLocalReview(current,selectedCatalogLesson.id,activeLocalReview.stage,correct,total):completeLocalLesson(current,selectedCatalogLesson.id,correct,total);
    persistStudyProgress(next);
  };

  const selectLearner = (key: LearnerKey) => {
    setLearnerKey(key);
    setLessonOpen(false);
    setView('dashboard');
    setTrackKey(primaryVisibleTrack(key));
    setSelectedCatalogLesson(null);
    setActiveLocalReview(null);
  };

  const currentReviewCompletion=activeLocalReview?.lessonId===activeTrack.lessonId?localProgress.reviews[activeTrack.lessonId]?.[activeLocalReview.stage]:undefined;
  const localCompletion=localProgress.completed[activeTrack.lessonId];
  const canSaveLocalAttempt=activeTrack.origin==='local-model'&&(!localCompletion||(activeLocalReview&&!currentReviewCompletion));

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
            <span>{tracks.find(track => track.key === primaryVisibleTrack(learnerKey))?.name} • Dublin 2028/29</span>
          </div>
          <div className="status-dot" title="Profile active" />
        </div>
        <div className="learner-switch" aria-label="Learner profile">
          <button className={learnerKey === 'rafael' ? 'active' : ''} onClick={() => selectLearner('rafael')}>Rafael</button>
          <button className={learnerKey === 'viviane' ? 'active' : ''} onClick={() => selectLearner('viviane')}>Viviane</button>
        </div>

        {!privateDataVisible && <div className="priority-note" role="status" data-testid="account-preview-notice">
          <strong>Profile preview only</strong><span>You are still signed in as {getLearnerProfile(accountLearnerKey).displayName}. Voice and personalised audio actions are unavailable for this preview. Sign out to change accounts.</span>
        </div>}
        <nav className="nav-stack">
          <NavButton label="Dashboard" icon="⌂" active={view === 'dashboard'} onClick={() => { setView('dashboard'); setLessonOpen(false); }} />
          <NavButton label="Learning" icon="▤" active={view === 'learn'} onClick={() => { setView('learn'); setLessonOpen(false); }} />
          <NavButton label="Mock exams" icon="✓" active={view === 'mock-exams'} onClick={() => { setView('mock-exams'); setLessonOpen(false); }} />
          <NavButton label="English Academy" icon="EN" active={view === 'english-academy'} onClick={() => { setView('english-academy'); setLessonOpen(false); }} />
          <NavButton label="Revision" icon="↻" active={view === 'revision'} onClick={() => { setView('revision'); setLessonOpen(false); }} />
          <NavButton label="Error Bank" icon="!" active={view === 'error-bank'} onClick={() => { setView('error-bank'); setLessonOpen(false); }} />
          <NavButton label="Performance" icon="◫" active={view === 'performance'} onClick={() => { setView('performance'); setLessonOpen(false); }} />
          <NavButton label="Professor" icon="◉" active={view === 'professor'} onClick={() => { setView('professor'); setLessonOpen(false); }} />
        </nav>

        <div className="side-divider" />
        <div className="side-caption">LEARNING TRACKS</div>
        <div className="track-mini-list">
          {visibleTracks.map((track) => (
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
        {new URLSearchParams(window.location.search).get('previewCheck')==='1' && <PreviewConfigurationCheck />}
        {new URLSearchParams(window.location.search).get('previewCheck')==='1' && <PreviewSessionRecovery />}
        {new URLSearchParams(window.location.search).get('previewCheck')==='1' && <PreviewRecoveryDiscovery />}
        <header className="topbar">
          <div>
            <div className="eyebrow">{profile.displayName.toUpperCase()} • DUBLIN 2028/29</div>
            <h1>{lessonOpen ? activeTrack.lesson : titleForView(view)}</h1>
            <p>{lessonOpen ? activeTrack.focus : subtitleForView(view, profile)}</p>
          </div>
          <div className="top-actions">
            {curriculumPreview?<span className="cefr-pill" data-testid="account-study-sync">{studySyncStatus==='synced'?'Progress synced':studySyncStatus==='saving'?'Saving progress…':studySyncStatus==='loading'?'Loading progress…':'Saved on this device'}</span>:null}
            <span className="cefr-pill">English {profile.english.cefr} → {profile.english.targetCefr}</span>
            <button className="ghost-btn" onClick={() => { setView('dashboard'); setLessonOpen(false); }}>Today</button>
            <button className="round-btn" aria-label="Refresh measured learning" onClick={() => void refreshMemory()}>↻</button>
          </div>
        </header>

        {lessonOpen ? (
          <LessonView key={account.userId+':'+learnerKey+':'+activeTrack.lessonId} track={activeTrack} learnerKey={learnerKey} memory={visibleMemory} activeTab={lessonTab} setActiveTab={setLessonTab} close={() => { setLessonOpen(false); setActiveLocalReview(null); setView('dashboard'); }} localCompletion={localCompletion} onCompleteLocal={canSaveLocalAttempt?completeCurrentLocalLesson:undefined} nextLocalLesson={activeLocalReview?null:nextLocalLesson} onOpenNextLocal={!activeLocalReview&&nextLocalLesson?()=>openLesson(nextLocalLesson.track,nextLocalLesson):undefined} localReviewStage={activeLocalReview?.lessonId===activeTrack.lessonId?activeLocalReview.stage:undefined} localReviewCompletion={currentReviewCompletion} />
        ) : view === 'dashboard' ? (
          <Dashboard learnerKey={learnerKey} profile={profile} memory={visibleMemory} memoryStatus={memoryStatus} openLesson={openLesson} openView={setView} catalog={supportedCatalog} localProgress={localProgress} />
        ) : view === 'learn' ? (
          <LearningLibrary learnerKey={learnerKey} catalog={supportedCatalog} catalogUnavailable={catalogUnavailable} openLesson={openLesson} localProgress={localProgress} />
        ) : view === 'mock-exams' ? (
          <LocalMockExamView scope={account.userId} />
        ) : view === 'english-academy' ? (
          <EnglishAcademyView profile={profile} learnerKey={learnerKey} catalog={supportedCatalog} localProgress={localProgress} openLesson={openLesson} openView={setView} />
        ) : view === 'revision' ? (
          <RevisionView memory={visibleMemory} memoryStatus={memoryStatus} catalog={supportedCatalog} localProgress={localProgress} openLocalReview={(item)=>openLesson(item.lesson.track,item.lesson,{tab:'Test',reviewStage:item.stage})} />
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

function Dashboard({ learnerKey, profile, memory, memoryStatus, openLesson, openView, catalog, localProgress }: {
  learnerKey: LearnerKey;
  profile: LearningProfile;
  memory: LearningMemorySnapshot | null;
  memoryStatus: MemoryStatus;
  openLesson: (key: TrackKey,lesson?:CatalogLesson) => void;
  openView: (view: ViewKey) => void;
  catalog: CatalogLesson[];
  localProgress: LocalStudyProgress;
}) {
  const intelligence = useMemo(() => realIntelligence(memory, learnerKey), [memory, learnerKey]);
  const priorities = useMemo(() => rankAdaptivePriorities({ ...intelligence, now: new Date(), limit: 4 }), [intelligence]);
  const primaryTrack = primaryVisibleTrack(learnerKey);
  const primaryLabel = primaryTrack === 'english' ? 'Continue English' : primaryTrack === 'payroll' ? 'Continue Payroll' : 'Continue Finance';
  const dueReviews = memory?.reviews.filter((item) => item.status === 'due').length ?? 0;
  const measuredCompetencies = memory?.competencies.length ?? 0;
  const evaluatedSessions = memory?.history.length ?? 0;
  const localCourse=useMemo(()=>summarizeLocalCourse(catalog,localProgress,'finance'),[catalog,localProgress]);
  const englishCourse=useMemo(()=>summarizeLocalCourse(catalog,localProgress,'english'),[catalog,localProgress]);
  const showLocalCourse=primaryTrack==='finance'&&localCourse.total>0;
  const dailyLesson=showLocalCourse?localCourse.nextLesson:null;
  const dailyCode=dailyLesson?.title.split(' · ')[0]??'ACCA FR';
  const dailyResuming=!localCourse.allCompleted&&!!dailyLesson&&lastOpenedLocalLessonId(localProgress,'finance')===dailyLesson.id;
  const dailyAction=localCourse.allCompleted?'Review final lesson':dailyResuming?'Resume '+dailyCode:'Start '+dailyCode;
  const studyBlocks=dailyLesson?Math.ceil(dailyLesson.estimatedMinutes/30):0;
  const localReviews=useMemo(()=>buildLocalReviewSchedule(catalog,localProgress),[catalog,localProgress]);
  const dueLocalReviews=localReviews.filter(item=>item.status==='due');
  const englishReviews=useMemo(()=>buildLocalReviewSchedule(catalog,localProgress,new Date(),'english'),[catalog,localProgress]);
  const dueEnglishReviews=englishReviews.filter(item=>item.status==='due');
  const nextLocalReview=dueLocalReviews[0]??localReviews[0]??null;
  const remainingHours=Math.round(localCourse.remainingMinutes/6)/10;

  return (
    <section className="content-grid dashboard-grid">
      <div className="hero-panel">
        <div className="hero-kicker">{showLocalCourse?`TODAY'S ACCA FOCUS • ${localCourse.completedCount}/${localCourse.total} FINISHED`:`TODAY'S FOCUS • ${profile.displayName.toUpperCase()}`}</div>
        <h2>{dailyLesson?.title??'Build capability, not just knowledge.'}</h2>
        <p>{dailyLesson?`${dailyLesson.subtitle??'Local ACCA self-study lesson'}. Plan about ${dailyLesson.estimatedMinutes} minutes across ${studyBlocks} focused 30-minute block${studyBlocks===1?'':'s'}; your completion marker stays only in this browser.`:'Measured Professor sessions, recurring errors and spaced reviews determine adaptive priorities. When evidence is missing, the portal says so instead of filling the gap with demo scores.'}</p>
        <div className="hero-actions">
          <button className="primary-btn" onClick={() => dailyLesson?openLesson('finance',dailyLesson):openLesson(primaryTrack)}>{dailyLesson?dailyAction:primaryLabel}</button>
          <button className="secondary-btn" onClick={() => dailyLesson?openView('learn'):openLesson('english')}>{dailyLesson?'View all 23 lessons':'Start English practice'}</button>
        </div>
        <div className="union-accent" aria-hidden="true" />
      </div>

      <div className="metric-card">
        <div className="metric-label">{showLocalCourse?'ACCA LOCAL PROGRESS':'REVIEWS DUE'}</div>
        <div className="metric-value">{showLocalCourse?`${localCourse.completedCount}/${localCourse.total}`:dueReviews}</div>
        <div className="metric-foot">{showLocalCourse?`${localCourse.percent}% of the local preview finished`:`${memory?.reviews.length ?? 0} scheduled in memory`}</div>
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

      {showLocalCourse&&englishCourse.total>0?<section className="acca-study-board full-span" data-testid="today-study-plan">
        <div className="section-heading"><div><div className="eyebrow">WHAT TO STUDY TODAY</div><h2>One technical block, one English block, one retrieval block</h2></div><span>Simple local agenda · about 3 focused blocks</span></div>
        <div className="acca-agenda-grid">
          <article className="acca-agenda-card"><span>1 · ACCA FR</span><strong>{dailyLesson?.title??'Review your latest ACCA lesson'}</strong><small>{dailyLesson?`${dailyLesson.estimatedMinutes} min available as a complete lesson; choose one focused block today.`:'Curriculum complete — use a marked lesson for retrieval.'}</small><button className="primary-btn" onClick={()=>dailyLesson?openLesson('finance',dailyLesson):openView('revision')}>{dailyLesson?dailyAction:'Open revision'}</button></article>
          <article className="acca-agenda-card"><span>2 · ENGLISH</span><strong>{englishCourse.nextLesson?.title??'Review your latest English lesson'}</strong><small>{englishCourse.nextLesson?`${englishCourse.nextLesson.estimatedMinutes} min · keep the 50/50 everyday/professional sequence moving.`:'Eight-lesson local core complete.'}</small><button className="primary-btn" onClick={()=>englishCourse.nextLesson?openLesson('english',englishCourse.nextLesson):openView('english-academy')}>{englishCourse.nextLesson?'Open English block':'Open English Academy'}</button></article>
          <article className={`acca-agenda-card ${dueLocalReviews.length+dueEnglishReviews.length?'review-due':''}`}><span>3 · RETRIEVE OR TEST</span><strong>{dueLocalReviews.length+dueEnglishReviews.length?`${dueLocalReviews.length+dueEnglishReviews.length} spaced review${dueLocalReviews.length+dueEnglishReviews.length===1?'':'s'} due`:'ACCA FR Mini Mock series'}</strong><small>{dueLocalReviews.length+dueEnglishReviews.length?'Clear due D+1, D+7 or D+30 retrieval before adding more new material.':'No local review is due; choose one of two complementary 30-minute mocks.'}</small><button className="secondary-btn" onClick={()=>openView(dueLocalReviews.length+dueEnglishReviews.length?'revision':'mock-exams')}>{dueLocalReviews.length+dueEnglishReviews.length?'Open reviews':'Open mocks'}</button></article>
        </div>
      </section>:null}

      {showLocalCourse?<section className="acca-study-board full-span" data-testid="acca-study-board">
        <div className="section-heading"><div><div className="eyebrow">ACCA DAILY AGENDA</div><h2>Study, retrieve and keep the whole FR syllabus moving</h2></div><span>Local plan · no provider calls</span></div>
        <div className="acca-agenda-grid">
          <article className="acca-agenda-card"><span>NEW LEARNING</span><strong>{dailyLesson?.title??'Curriculum completed'}</strong><small>{dailyLesson?`${dailyLesson.estimatedMinutes} min · ${studyBlocks} focused blocks`:'All 23 lessons are available for review.'}</small>{dailyLesson?<button className="primary-btn" onClick={()=>openLesson('finance',dailyLesson)}>{dailyAction}</button>:null}</article>
          <article className={`acca-agenda-card ${dueLocalReviews.length?'review-due':''}`}><span>SPACED RETRIEVAL</span><strong>{dueLocalReviews.length?`${dueLocalReviews.length} review${dueLocalReviews.length===1?'':'s'} due`:nextLocalReview?`Next: ${nextLocalReview.stage} on ${shortDate(nextLocalReview.dueAt)}`:'Complete A1 to schedule reviews'}</strong><small>{nextLocalReview?nextLocalReview.lesson.title:'D+1, D+7 and D+30 appear automatically after completion.'}</small><button className="secondary-btn" onClick={()=>openView('revision')}>{dueLocalReviews.length?'Open due reviews':'View review plan'}</button></article>
          <article className="acca-agenda-card"><span>WEEKLY PACE</span><strong>{localCourse.completedLast7Days}/{localCourse.weeklyTarget} lessons</strong><small>{remainingHours} estimated hours remain · about {localCourse.estimatedWeeksRemaining} week{localCourse.estimatedWeeksRemaining===1?'':'s'} at the suggested pace</small><div className="progress-track" aria-label={`${localCourse.completedLast7Days} of ${localCourse.weeklyTarget} weekly lessons`}><span style={{width:`${Math.min(100,localCourse.completedLast7Days/localCourse.weeklyTarget*100)}%`}} /></div></article>
        </div>
        <div className="acca-module-grid" aria-label="ACCA progress by syllabus module">{localCourse.modules.map(module=><article key={module.code} className="acca-module-card"><div><b>{module.code}</b><span>{module.label}</span></div><strong>{module.completedCount}/{module.total}</strong><div className="progress-track"><span style={{width:`${module.percent}%`}} /></div><small>{module.remainingMinutes?`${Math.round(module.remainingMinutes/6)/10} h estimated remaining`:'Module completed'}</small></article>)}</div>
      </section>:null}

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
          <h2>Your active learning tracks</h2>
        </div>
        <span>Measured sessions • Error Bank • spaced review</span>
      </div>

      {visibleTracks.map((track) => {
        const trackSessions = memory?.history.filter((session) => session.lessonId === track.lessonId) ?? [];
        const latestTrackSession = trackSessions[0] ?? null;
        const measuredAverage = sessionAverage(latestTrackSession);
        const trackLocal=showLocalCourse&&track.key==='finance';
        const displayedLesson=trackLocal&&dailyLesson?dailyLesson.title:track.lesson;
        return (
          <article className={`track-card ${track.key === primaryTrack ? 'primary-track-card' : ''}`} key={track.key}>
            <div className="track-card-head">
              <span className={`track-badge ${track.key}`}>{track.accent}</span>
              <span className="readiness-pill">{trackLocal?`${localCourse.completedCount}/${localCourse.total} finished locally`:measuredAverage == null ? 'Awaiting evidence' : `${Math.round(measuredAverage)}% measured`}</span>
            </div>
            <h3>{track.name}</h3>
            <p className="track-subtitle">{track.subtitle}</p>
            <p className="next-label">{trackLocal?(dailyResuming?'RESUME ACCA LESSON':'NEXT ACCA LESSON'):'NEXT GOLDEN LESSON'}</p>
            <strong className="lesson-name">{displayedLesson}</strong>
            <div className="progress-row">
              <span>{trackLocal?`${localCourse.percent}% complete in this browser`:trackSessions.length === 0 ? 'No evaluated session yet' : `${trackSessions.length} evaluated session${trackSessions.length === 1 ? '' : 's'} • latest ${shortDate(latestTrackSession?.completedAt ?? latestTrackSession?.startedAt)}`}</span>
            </div>
            {trackLocal?<div className="progress-track" aria-label={`${localCourse.percent}% of local ACCA lessons finished`}><span style={{width:`${localCourse.percent}%`}} /></div>:null}
            <button className="card-action" onClick={() => openLesson(track.key,trackLocal?dailyLesson??undefined:undefined)}>{trackLocal?dailyAction:'Continue learning'} →</button>
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

function LearningLibrary({ learnerKey, catalog, catalogUnavailable, openLesson,localProgress }: { learnerKey: LearnerKey; catalog: CatalogLesson[]; catalogUnavailable:boolean; openLesson: (key: TrackKey,lesson?:CatalogLesson) => void;localProgress:LocalStudyProgress }) {
  const primaryTrack=primaryVisibleTrack(learnerKey);
  const available=catalog.filter(lesson=>isTrackVisible(lesson.track));
  const accaCourse=summarizeLocalCourse(catalog,localProgress,'finance');
  const englishCourse=summarizeLocalCourse(catalog,localProgress,'english');
  return <section className="page-stack" data-testid="learning-library">
    <div className="section-heading"><div><div className="eyebrow">LEARNING LIBRARY</div><h2>Published lessons with reviewed runtime content</h2></div><span>{available.length||visibleTracks.length} available now</span></div>
    {available.some(lesson=>lesson.origin==='local-model')&&<p role="status" className="priority-note" data-testid="local-curriculum-preview"><strong>Local curriculum preview · ACCA {accaCourse.completedCount}/{accaCourse.total} · English {englishCourse.completedCount}/{englishCourse.total}</strong><span>Model lessons are not published and do not enable Professor or Audio. Completion and checkpoint totals stay only in this browser; drafts and individual answers are not stored.</span></p>}
    {catalogUnavailable&&<p role="status" className="priority-note"><strong>Catalog temporarily unavailable</strong><span>Verified Golden Lessons from your visible tracks remain available as a safe fallback.</span></p>}
    <div className="library-grid">
      {available.length?available.map((lesson,index)=>{const base=tracks.find(t=>t.key===lesson.track)!;const completion=localProgress.completed[lesson.id];const isResume=lastOpenedLocalLessonId(localProgress,lesson.track)===lesson.id&&!completion;return <article className={`lesson-library-card ${lesson.track===primaryTrack?'primary-track-card':''} ${completion?'lesson-locally-complete':''}`} key={lesson.id} data-testid={`catalog-lesson-${lesson.slug}`}>
        <div className="lesson-index">{String(index+1).padStart(2,'0')}</div><span className={`track-badge ${lesson.track}`}>{base.accent}</span><h3>{lesson.title}</h3><p>{lesson.subtitle??base.focus}</p><div className="lesson-meta"><span>{lesson.estimatedMinutes} min</span><span>{base.name}</span><span>{completion?`Finished · ${completion.correct}/${completion.total}`:lesson.origin==='local-model'?'Reviewed self-study':lesson.id===base.lessonId?'Professor':'Written ready'}</span></div><button className="primary-btn" onClick={()=>openLesson(lesson.track,lesson)}>{completion?'Review lesson':isResume?'Resume lesson':'Open lesson'}</button>
      </article>}):visibleTracks.map((track,index)=><article className={`lesson-library-card ${track.key===primaryTrack?'primary-track-card':''}`} key={track.key}><div className="lesson-index">0{index+1}</div><span className={`track-badge ${track.key}`}>{track.accent}</span><h3>{track.lesson}</h3><p>{track.focus}</p><div className="lesson-meta"><span>10–15 min</span><span>Verified fallback</span><span>Professor</span></div><button className="primary-btn" onClick={()=>openLesson(track.key)}>Open Golden Lesson</button></article>)}
    </div>
  </section>;
}

function LessonView({ track, learnerKey, memory, activeTab, setActiveTab, close,localCompletion,onCompleteLocal,nextLocalLesson,onOpenNextLocal,localReviewStage,localReviewCompletion }: {
  track: Track;
  learnerKey: LearnerKey;
  memory: LearningMemorySnapshot | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  close: () => void;
  localCompletion?:{completedAt:string;correct:number;total:number};
  onCompleteLocal?:(correct:number,total:number)=>void;
  nextLocalLesson?:CatalogLesson|null;
  onOpenNextLocal?:()=>void;
  localReviewStage?:LocalReviewStage;
  localReviewCompletion?:{reviewedAt:string;correct:number;total:number};
}) {
  const account = useLearnerSession();
  const canUseActions = canUseLearnerActions(account.learnerKey,learnerKey,track.key);
  const interactiveLessonSupported = tracks.some((candidate)=>candidate.key===track.key&&candidate.lessonId===track.lessonId);
  const measuredSession = memory?.history.find((session) => session.lessonId === track.lessonId) ?? null;
  const measuredScores = measuredSession ? scorePairs(measuredSession) : [];
  const [conversationBusy,setConversationBusy]=useState(false);
  const [workshopId,setWorkshopId]=useState<string|undefined>();
  const prepareWorkshop=(id:string)=>{
    if(conversationBusy||!canUseActions||!interactiveLessonSupported||!WORKSHOP_CASES[track.key].some(c=>c.id===id))return;
    setWorkshopId(id);setActiveTab('Professor');
  };
  const clearWorkshop=()=>{if(!conversationBusy)setWorkshopId(undefined);};

  return (
    <section className="lesson-shell" data-testid="lesson-shell">
        <div className="lesson-toolbar">
        <button className="back-btn" onClick={close}>← Dashboard</button>
        <div className="lesson-progress"><span>{track.origin==='local-model'?'Reviewed self-study lesson':interactiveLessonSupported?'Golden Lesson':'Reviewed written lesson'}</span><b>{measuredSession ? `Last evaluated ${shortDate(measuredSession.completedAt ?? measuredSession.startedAt)}` : 'Baseline not measured yet'}</b></div>
      </div>
      <div className="lesson-tabs" role="tablist">
        {lessonTabs.map((tab) => (
          <button key={tab} role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>{tab}</button>
        ))}
      </div>
      <div className="lesson-layout">
        <article className="lesson-content-card">
          <div className="track-card-head"><span className={`track-badge ${track.key}`}>{track.accent}</span><span className="readiness-pill">{track.origin==='local-model'?'Account-synced · no providers':'Premium lesson'}</span></div>
          <div className="eyebrow">{activeTab.toUpperCase()}</div>
          {interactiveLessonSupported?<LessonProfessorWorkspace track={track.key} lessonId={track.lessonId} learnerKey={learnerKey} activeTab={activeTab} onTabChange={setActiveTab} onActivityChange={setConversationBusy} workshopId={workshopId} onClearWorkshop={clearWorkshop}/>:null}
          <LessonStudyPanel key={track.lessonId} track={track.key} lessonId={track.lessonId} lessonSlug={track.lessonSlug} activeTab={activeTab} onTabChange={setActiveTab} onPrepareWorkshop={prepareWorkshop} handoffDisabled={conversationBusy||!canUseActions||!interactiveLessonSupported} readerDisabled={conversationBusy||!canUseActions} localCompletion={localCompletion} onCompleteLocal={onCompleteLocal} nextLessonTitle={nextLocalLesson?.title} onOpenNextLesson={onOpenNextLocal} localReviewStage={localReviewStage} localReviewCompletion={localReviewCompletion} />
          {!interactiveLessonSupported && (activeTab === 'Audio' || activeTab === 'Professor') ? <p role="status" data-testid="p1-interactive-gate">{activeTab==='Audio'&&track.key!=='payroll'&&isP1Slug(track.key,track.lessonSlug)?'Verify this lesson below to access its audio controls.':'This reviewed written lesson is available for self-study. This interactive feature is awaiting activation.'}</p> : null}
          {!interactiveLessonSupported && canUseActions && isP1Slug(track.key,track.lessonSlug) && (activeTab === 'Audio' || activeTab === 'Professor') ? <LessonReadinessCheck key={[account.userId,track.key,track.lessonId,track.lessonSlug].join(':')} userId={account.userId} lessonId={track.lessonId} lessonSlug={track.lessonSlug} lessonTitle={track.lesson} track={track.key} activeTab={activeTab}/> : null}
          {interactiveLessonSupported && (conversationBusy && activeTab === 'Audio' ? <p role="status" data-testid="audio-conversation-guard">End the Professor session before playing lesson audio. Written tabs remain available.</p> : <>{activeTab === 'Audio' && (canUseActions ? <PremiumAudioPanel lessonId={track.lessonId} lessonTitle={track.lesson} /> : <p role="status" data-testid="audio-account-mismatch">Audio actions require the matching signed-in learner account.</p>)}</>)}
          {/* Interactive providers are mounted only for lessons with a reviewed server handoff. */}
        </article>
        <aside className="lesson-side-card">
          <div className="eyebrow">MEASURED LEARNING SIGNALS</div>
          <h3>{measuredSession ? 'Latest evaluated evidence' : 'Baseline pending'}</h3>
          {localCompletion?<div className="priority-note local-progress-note"><strong>Finished and saved to your account</strong><span>{localCompletion.correct}/{localCompletion.total} checkpoint answers correct in the saved attempt · practice completion only, not measured mastery.</span></div>:null}
          {measuredScores.length > 0
            ? measuredScores.map(([label, value]) => <Signal key={label} label={label} value={Math.round(value)} />)
            : <div className="priority-note"><strong>No synthetic score</strong><span>Complete an evaluated Professor session for this lesson. Scores will appear only after measured evidence exists.</span></div>}
          {measuredSession?.feedback?.summary ? <div className="priority-note"><strong>Evaluator summary</strong><span>{measuredSession.feedback.summary}</span></div> : null}
        </aside>
      </div>
    </section>
  );
}

function Signal({ label, value }: { label: string; value: number }) {
  return <div className="signal-row"><div><span>{label}</span><b>{value}%</b></div><div className="progress-track"><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div></div>;
}

function EnglishAcademyView({ profile, learnerKey, catalog, localProgress, openLesson, openView }: { profile: LearningProfile; learnerKey: LearnerKey;catalog:CatalogLesson[];localProgress:LocalStudyProgress;openLesson:(key:TrackKey,lesson?:CatalogLesson)=>void;openView:(view:ViewKey)=>void }) {
  const course=useMemo(()=>summarizeLocalCourse(catalog,localProgress,'english'),[catalog,localProgress]);
  const nextLesson=course.nextLesson;
  const resuming=!course.allCompleted&&!!nextLesson&&lastOpenedLocalLessonId(localProgress,'english')===nextLesson.id;
  const action=course.allCompleted?'Review final English lesson':resuming?'Resume English lesson':'Start English lesson';
  const reviews=useMemo(()=>buildLocalReviewSchedule(catalog,localProgress,new Date(),'english'),[catalog,localProgress]);
  const dueReviews=reviews.filter(item=>item.status==='due').length;
  const everyday=course.modules.find(module=>module.code==='E');
  const professional=course.modules.find(module=>module.code==='P');
  const currentVivianeWeek=Math.min(4,Math.floor(course.completedCount/5)+1);
  const currentVivianeWeekLessons=course.lessons.slice((currentVivianeWeek-1)*5,currentVivianeWeek*5);
  return (
    <section className="page-stack" data-testid="english-academy-view">
      <div className="academy-hero">
        <div>
          <div className="eyebrow light">ENGLISH ACADEMY • {profile.displayName.toUpperCase()}</div>
          <h2>{learnerKey==='viviane'?'Everyday fluency first. Payroll confidence in context.':'General English and technical communication in equal measure.'}</h2>
          <p>British and American English are both accepted, with deliberate Irish exposure for real life in Dublin. {learnerKey==='viviane'?'Her professional practice centres on Payroll, Departamento Pessoal and People Operations — not Finance.':'Professional practice centres on Finance, Accounting, Tax, Payroll, Treasury and Compliance.'}</p>
          <div className="hero-actions"><button className="primary-btn" onClick={() => nextLesson?openLesson('english',nextLesson):openLesson('english')}>{nextLesson?action:'Open English Golden Lesson'}</button><span className="academy-level">{profile.english.cefr} provisional • {profile.english.targetCefr} target</span></div>
        </div>
        <div className="exposure-ring" aria-label="Language exposure mix"><strong>40 / 40 / 20</strong><span>UK • US • Ireland</span></div>
      </div>

      {course.total>0?<section className="acca-study-board english-study-board" data-testid="english-study-board">
        <div className="section-heading"><div><div className="eyebrow">ENGLISH DAILY AGENDA</div><h2>Build everyday fluency and professional confidence together</h2></div><span>{profile.english.curriculumMix.everydayPct}/{profile.english.curriculumMix.professionalPct} profile plan · no provider calls</span></div>
        <div className="acca-agenda-grid">
          <article className="acca-agenda-card"><span>NEXT LESSON</span><strong>{nextLesson?.title??'Core completed'}</strong><small>{nextLesson?`${nextLesson.estimatedMinutes} min · progress syncs with your account`:'All eight lessons remain available for review.'}</small>{nextLesson?<button className="primary-btn" onClick={()=>openLesson('english',nextLesson)}>{action}</button>:null}</article>
          <article className="acca-agenda-card"><span>{profile.english.curriculumMix.everydayPct} / {profile.english.curriculumMix.professionalPct} BALANCE</span><strong>{everyday?.total??0} everyday · {professional?.total??0} {profile.english.curriculumMix.professionalLabel}</strong><small>{learnerKey==='viviane'?'Four everyday lessons and one Payroll/People Operations lesson per week.':'The monthly sequence keeps everyday and technical English equally represented.'}</small><button className="secondary-btn" onClick={()=>openView('learn')}>View English lessons</button></article>
          <article className={`acca-agenda-card ${dueReviews?'review-due':''}`}><span>SPACED RETRIEVAL</span><strong>{dueReviews?`${dueReviews} review${dueReviews===1?'':'s'} due`:'D+1 · D+7 · D+30'}</strong><small>{course.completedCount?`${course.completedCount}/${course.total} lessons finished`:'Finish the first lesson to start the review cycle.'}</small><button className="secondary-btn" onClick={()=>openView('revision')}>{dueReviews?'Open due reviews':'View review plan'}</button></article>
        </div>
        <div className="acca-module-grid" aria-label="English progress by balance area">{course.modules.map(module=><article key={module.code} className="acca-module-card"><div><b>{module.code}</b><span>{module.label}</span></div><strong>{module.completedCount}/{module.total}</strong><div className="progress-track"><span style={{width:`${module.percent}%`}} /></div><small>{module.remainingMinutes?`${module.remainingMinutes} min estimated remaining`:'Area completed'}</small></article>)}</div>
      </section>:null}

      <div className="academy-grid">
        <article className="academy-card wide-academy-card">
          <div className="eyebrow">{learnerKey==='viviane'?`WEEK ${currentVivianeWeek} · 4 EVERYDAY + 1 PROFESSIONAL`:'THIS WEEK'}</div>
          <h3>Short, varied sessions that convert input into speech</h3>
          <div className="academy-week">
            {(learnerKey==='viviane'?currentVivianeWeekLessons.map((lesson,index)=>({day:index+1,title:lesson.title,primarySkills:[lesson.moduleSequence===1?'everyday':'Payroll & People Ops'],minutes:lesson.estimatedMinutes,optional:false})):DEFAULT_WEEK).map((session) => (
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

function LocalReviewSection({track,label,catalog,localProgress,openLocalReview}:{track:'finance'|'english';label:string;catalog:CatalogLesson[];localProgress:LocalStudyProgress;openLocalReview:(item:LocalReviewItem)=>void}){
  const localCourse=useMemo(()=>summarizeLocalCourse(catalog,localProgress,track),[catalog,localProgress,track]);
  const localReviews=useMemo(()=>buildLocalReviewSchedule(catalog,localProgress,new Date(),track),[catalog,localProgress,track]);
  const dueLocalReviews=localReviews.filter(item=>item.status==='due');
  const visibleLocalReviews=[...dueLocalReviews,...localReviews.filter(item=>item.status==='scheduled').slice(0,Math.max(0,6-dueLocalReviews.length))];
  if(!localCourse.total)return null;
  return <>
    <div className="section-heading"><div><div className="eyebrow">LOCAL {label.toUpperCase()} RETRIEVAL</div><h2>Revisit completed {label} lessons before they fade</h2></div><span>{dueLocalReviews.length} due · D+1 • D+7 • D+30</span></div>
    <p className="priority-note"><strong>Account-synced review plan</strong><span>These reminders follow your saved completion dates across signed-in devices. A retrieval records only the stage and aggregate checkpoint result; it is not measured mastery{track==='finance'?' or exam readiness':''}.</span></p>
    {visibleLocalReviews.length?<div className="review-list" data-testid={track==='finance'?'local-review-list':'local-english-review-list'}>{visibleLocalReviews.map(item=><div className={`review-row ${item.status==='due'?'local-review-due':''}`} key={`${item.lesson.id}:${item.stage}`}>
      <span className="review-date">{item.stage}</span><div><strong>{item.lesson.title}</strong><span>{item.status==='due'?`Due since ${shortDate(item.dueAt)}`:`Scheduled ${shortDate(item.dueAt)}`}</span></div><button className={item.status==='due'?'primary-btn':'secondary-btn'} disabled={item.status!=='due'} onClick={()=>openLocalReview(item)}>{item.status==='due'?'Review now':'Scheduled'}</button>
    </div>)}</div>:<div className="priority-note local-progress-note"><strong>{localCourse.completedCount?'Local review queue complete':'No local review scheduled yet'}</strong><span>{localCourse.completedCount?`All currently planned ${label} retrieval stages have been saved.`:`Finish a ${label} lesson checkpoint to schedule D+1, D+7 and D+30 retrieval.`}</span></div>}
  </>;
}

function RevisionView({ memory, memoryStatus, catalog, localProgress, openLocalReview }: { memory: LearningMemorySnapshot | null; memoryStatus: MemoryStatus;catalog:CatalogLesson[];localProgress:LocalStudyProgress;openLocalReview:(item:LocalReviewItem)=>void }) {
  const reviews = memory?.reviews ?? [];
  return (
    <section className="page-stack">
      <LocalReviewSection track="finance" label="ACCA" catalog={catalog} localProgress={localProgress} openLocalReview={openLocalReview}/>
      <LocalReviewSection track="english" label="English" catalog={catalog} localProgress={localProgress} openLocalReview={openLocalReview}/>
      <div className="section-heading"><div><div className="eyebrow">MEASURED SPACED REVIEW</div><h2>Review what measured evidence says is most likely to be forgotten</h2></div><span>D+1 • D+7 • D+30 • D+90</span></div>
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
  const primaryTrack = primaryVisibleTrack(learnerKey);
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
  if (view === 'mock-exams') return 'ACCA FR Mock Engine';
  if (view === 'english-academy') return 'English Academy';
  if (view === 'revision') return 'Revision queue';
  if (view === 'error-bank') return 'Error Bank';
  if (view === 'performance') return 'Performance & readiness';
  return 'Professor';
}

function subtitleForView(view: ViewKey, profile: LearningProfile) {
  if (view === 'dashboard') return `One adaptive system tuned for ${profile.displayName}, with measured learning evidence kept private to the signed-in account.`;
  if (view === 'learn') return 'Explore Finance and English at your own pace.';
  if (view === 'mock-exams') return 'Timed, provider-free exam practice with transparent local marking and spaced debriefs.';
  if (view === 'english-academy') return 'General English, professional communication and real-world Dublin exposure in one adaptive programme.';
  if (view === 'revision') return 'Only scheduled reviews from real evaluated sessions appear here.';
  if (view === 'error-bank') return 'Only recurring technical and language mistakes recorded from learner evidence appear here.';
  if (view === 'performance') return 'Measured scores are shown without inventing an external readiness benchmark.';
  return 'Premium live tutoring on the deployed LiveKit + OpenAI Realtime path.';
}

export default App;
