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
import {curriculumPreviewRuntimeEnabled} from './config/curriculumPreview';
import {isFeatureEnabled} from './config/features';
import {localEnglishLessonsForLearner} from './learning/localEnglishCatalogForLearner';
import {buildLocalReviewSchedule,completeLocalLesson,completeLocalReview,lastOpenedLocalLessonId,mergeLocalStudyProgress,parseLocalStudyProgress,readLocalStudyProgress,recordLocalLessonOpened,summarizeLocalCourse,writeLocalStudyProgress,type LocalReviewItem,type LocalReviewStage,type LocalStudyProgress} from './learning/localStudyProgress';
import {isCurriculumUnitReady,readinessSummary,readyCurriculumUnits} from './learning/curriculumReadiness';
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
import { LANGUAGE_COURSES, LANGUAGE_UNIT_FLOW, type LanguageKey } from './learning/languageCourseArchitecture';
import {deepInteractiveAudioLesson,deepProfessorProviderLessonId} from './learning/deepInteractiveRegistry';

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
    name: 'ACCA Financial Reporting',
    subtitle: 'Exam syllabus • Practice • Revision',
    learner: 'Rafael',
    accent: 'FINANCE',
    lesson: 'IFRS 18, Group Reporting & Irish Statutory Accounts',
    lessonId: 'b3639582-3c32-4147-a4b3-84237d11a66e',
    lessonSlug: 'ifrs-18-group-reporting-irish-statutory',
    focus: 'Executive finance judgement, reporting and Dublin readiness',
  },
  {
    key: 'payroll',
    name: 'Payroll Academy',
    subtitle: 'Irish Payroll • Controls • Employee service',
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

const tracksForLearner=(_learner:LearnerKey)=>tracks.filter(track=>isTrackVisible(track.key));
// Retained by the legacy dashboard component while the course-first home owns the active route.
const visibleTracks=tracks.filter(track=>isTrackVisible(track.key));
const reviewIntervals = new Set(['D+1', 'D+7', 'D+30', 'D+90']);
const errorDomains = new Set(['technical', 'grammar', 'vocabulary', 'pronunciation', 'fluency', 'register']);
const LOCAL_DEPTH_REVIEW_LABEL='Depth review in progress';

function lessonWorkloadLabel(lesson:CatalogLesson){
  if(lesson.origin!=='local-model')return `${lesson.estimatedMinutes} min`;
  return isCurriculumUnitReady(lesson)?'Deep-reviewed unit':'Rebuilding · not open yet';
}

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
  const [languageKey, setLanguageKey] = useState<LanguageKey>('english');
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
  const learnerTracks=useMemo(()=>tracksForLearner(learnerKey),[learnerKey]);
  const learnerTrackKeys=useMemo(()=>new Set(learnerTracks.map(track=>track.key)),[learnerTracks]);
  const curriculumPreview=curriculumPreviewRuntimeEnabled;
  const supportedCatalog=useMemo(()=>{
    const published=catalog.filter((lesson)=>{const base=tracks.find(t=>t.key===lesson.track);return learnerTrackKeys.has(lesson.track)&&!!base&&(lesson.id===base.lessonId||lesson.slug===p1SlugFor(lesson.track)||isSequence3Slug(lesson.track,lesson.slug)||isSequence4Slug(lesson.track,lesson.slug)||isRemainingWrittenSlug(lesson.track,lesson.slug));});
    if(!curriculumPreview)return published;
    const local=[...localEnglishLessonsForLearner(learnerKey)];
    // The isolated Preview is a canonical local curriculum, not a blend with the
    // legacy published catalogue. Merging by slug left semantic duplicates with
    // different identities interleaved in the same course tree.
    return local;
  },[catalog,curriculumPreview,learnerKey,learnerTrackKeys]);
  const activeTrack = useMemo(() => {
    const base=tracks.find((t)=>t.key===trackKey)??tracks.find(t=>t.key==='english')!;
    const selected=selectedCatalogLesson?.track===trackKey?selectedCatalogLesson:null;
    return selected?{...base,lesson:selected.title,lessonId:selected.id,lessonSlug:selected.slug,focus:selected.subtitle??base.focus,origin:selected.origin}:base;
  },[trackKey,selectedCatalogLesson]);
  const readyCatalog=useMemo(()=>readyCurriculumUnits(supportedCatalog),[supportedCatalog]);
  const nextLocalLesson=useMemo(()=>{
    if(selectedCatalogLesson?.origin!=='local-model')return null;
    const lessons=readyCatalog.filter(lesson=>lesson.origin==='local-model'&&lesson.track===selectedCatalogLesson.track).sort((a,b)=>a.sequence-b.sequence);
    const index=lessons.findIndex(lesson=>lesson.id===selectedCatalogLesson.id);
    return index>=0?lessons[index+1]??null:null;
  },[readyCatalog,selectedCatalogLesson]);

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
    setCatalogUnavailable(false);
    if(curriculumPreview){setCatalog([]);return;}
    const controller=new AbortController();
    void loadPublishedCurriculumCatalog(controller.signal).then(setCatalog).catch(()=>{if(!controller.signal.aborted){setCatalog([]);setCatalogUnavailable(true);}});
    return ()=>controller.abort();
  },[account.userId,curriculumPreview]);

  const privateDataVisible = learnerKey === accountLearnerKey;
  const visibleMemory = useMemo(()=>{
    if(!privateDataVisible||!memory)return null;
    const englishIds=new Set([tracks.find(track=>track.key==='english')!.lessonId,...supportedCatalog.filter(lesson=>lesson.track==='english').map(lesson=>lesson.id)]);
    const history=memory.history.filter(session=>englishIds.has(session.lessonId));
    return {...memory,history,latest:history[0]??null,
      // The older aggregate evidence has no reliable course identifier. Keep
      // those records intact in storage without presenting them as English.
      competencies:[],errors:[],reviews:[]};
  },[memory,privateDataVisible,supportedCatalog]);
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
    if(!isTrackVisible(key))return;
    setLanguageKey('english');
    const measured=new Set([...(visibleMemory?.history??[]).map(x=>x.lessonId),...Object.keys(localProgress.completed)]);
    const resolved=lesson??chooseNextPublishedLesson(readyCatalog,key,measured);
    if(resolved?.origin==='local-model'&&!isCurriculumUnitReady(resolved)){
      setTrackKey(key);setSelectedCatalogLesson(null);setActiveLocalReview(null);setLessonOpen(false);setView('learn');return;
    }
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
    setLanguageKey('english');
    setSelectedCatalogLesson(null);
    setActiveLocalReview(null);
  };

  const currentReviewCompletion=activeLocalReview?.lessonId===activeTrack.lessonId?localProgress.reviews[activeTrack.lessonId]?.[activeLocalReview.stage]:undefined;
  const localCompletion=localProgress.completed[activeTrack.lessonId];
  const canSaveLocalAttempt=activeTrack.origin==='local-model'&&(!localCompletion||(activeLocalReview&&!currentReviewCompletion));
  const selectCourse=(key:TrackKey)=>{
    if(!isTrackVisible(key))return;
    setLanguageKey('english');
    setTrackKey(key);setSelectedCatalogLesson(null);setActiveLocalReview(null);setLessonOpen(false);setView('dashboard');
  };
  const selectSpanish=()=>{setLanguageKey('spanish');setLessonOpen(false);setSelectedCatalogLesson(null);setActiveLocalReview(null);setView('dashboard');};

  return (
    <div className="app-frame">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand-row">
          <div className="brand-mark">La</div>
          <div>
            <div className="brand-name">Language Hub</div>
            <div className="brand-sub">ENGLISH · ESPAÑOL</div>
          </div>
        </div>

        <div className="profile-card profile-card-v2" data-testid="active-learner-card">
          <div className="avatar">{profile.initials}</div>
          <div className="profile-card-copy">
            <strong>{profile.displayName}</strong>
            <span>English &amp; Español • Dublin 2028/29</span>
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
        <NavButton label="Dashboard" icon="⌂" active={view === 'dashboard'&&!lessonOpen} onClick={() => { setView('dashboard'); setLessonOpen(false); }} />
        <div className="side-divider" />
        <div className="side-caption">MY COURSES</div>
        <CourseTree learnerKey={learnerKey} tracks={learnerTracks} catalog={supportedCatalog} activeTrack={languageKey==='english'?trackKey:null} activeLessonId={languageKey==='english'&&lessonOpen?activeTrack.lessonId:null} localProgress={localProgress} onSelectCourse={selectCourse} onSelectLesson={openLesson}/>
        <button className={`language-course-button ${languageKey==='spanish'?'active':''}`} aria-current={languageKey==='spanish'?'page':undefined} onClick={selectSpanish}><span className="course-tree-icon spanish">ES</span><strong>ESPAÑOL</strong><small>Preparando unidades</small></button>
        {languageKey==='english'?<nav className="nav-stack utility-nav" aria-label="Learning tools">
          <NavButton label="Revision" icon="↻" active={view === 'revision'} onClick={() => { setView('revision'); setLessonOpen(false); }} />
          <NavButton label="Ask the Professor" icon="◉" active={view === 'professor'} onClick={() => { setView('professor'); setLessonOpen(false); }} />
        </nav>:null}

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
            <h1>{languageKey==='spanish'?'Español':lessonOpen ? activeTrack.lesson : titleForCourseView(view,activeTrack)}</h1>
            <p>{languageKey==='spanish'?'The same learning journey, with original Spanish units added as they are reviewed.':lessonOpen ? activeTrack.focus : subtitleForCourseView(view,profile,activeTrack)}</p>
          </div>
          <div className="top-actions">
            {curriculumPreview?<span className="cefr-pill" data-testid="account-study-sync">{studySyncStatus==='synced'?'Progress synced':studySyncStatus==='saving'?'Saving progress…':studySyncStatus==='loading'?'Loading progress…':'Saved on this device'}</span>:null}
            {languageKey==='english'?<span className="cefr-pill">English {profile.english.cefr} → {profile.english.targetCefr}</span>:null}
            <button className="ghost-btn" onClick={() => { setView('dashboard'); setLessonOpen(false); }}>Today</button>
            <button className="round-btn" aria-label="Refresh measured learning" onClick={() => void refreshMemory()}>↻</button>
          </div>
        </header>

        {languageKey==='english'&&view!=='revision'&&view!=='professor'?<CourseTabs track={trackKey} view={view} lessonOpen={lessonOpen} onOpen={(next)=>{setLessonOpen(false);setView(next);}}/>:null}

        {languageKey==='spanish'?<SpanishCourseWorkspace />:lessonOpen ? (
          <LessonView key={account.userId+':'+learnerKey+':'+activeTrack.lessonId} track={activeTrack} learnerKey={learnerKey} memory={visibleMemory} activeTab={lessonTab} setActiveTab={setLessonTab} close={() => { setLessonOpen(false); setActiveLocalReview(null); setView('dashboard'); }} localCompletion={localCompletion} onCompleteLocal={canSaveLocalAttempt?completeCurrentLocalLesson:undefined} nextLocalLesson={activeLocalReview?null:nextLocalLesson} onOpenNextLocal={!activeLocalReview&&nextLocalLesson?()=>openLesson(nextLocalLesson.track,nextLocalLesson):undefined} localReviewStage={activeLocalReview?.lessonId===activeTrack.lessonId?activeLocalReview.stage:undefined} localReviewCompletion={currentReviewCompletion} />
        ) : view === 'dashboard' ? (
          <CourseHome trackKey={trackKey} learnerKey={learnerKey} profile={profile} memory={visibleMemory} memoryStatus={memoryStatus} openLesson={openLesson} openView={setView} catalog={supportedCatalog} localProgress={localProgress} />
        ) : view === 'learn' ? (
          <LearningLibrary learnerKey={learnerKey} trackKey={trackKey} catalog={supportedCatalog} catalogUnavailable={catalogUnavailable} openLesson={openLesson} localProgress={localProgress} />
        ) : view === 'mock-exams' ? (
          <LocalMockExamView scope={account.userId} />
        ) : view === 'english-academy' ? (
          <EnglishAcademyView profile={profile} learnerKey={learnerKey} catalog={supportedCatalog} localProgress={localProgress} openLesson={openLesson} openView={setView} />
        ) : view === 'revision' ? (
          <RevisionView catalog={supportedCatalog} localProgress={localProgress} openLocalReview={(item)=>openLesson(item.lesson.track,item.lesson,{tab:'Practice',reviewStage:item.stage})} />
        ) : view === 'error-bank' ? (
          <ErrorBankView trackKey={trackKey} memory={visibleMemory} memoryStatus={memoryStatus} />
        ) : view === 'performance' ? (
          <PerformanceView trackKey={trackKey} catalog={supportedCatalog} localProgress={localProgress} memory={visibleMemory} memoryStatus={memoryStatus} />
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

function SpanishCourseWorkspace(){
 const course=LANGUAGE_COURSES.spanish;
 return <section className="page-stack language-preparation" data-testid="spanish-course-workspace">
  <div className="course-overview-panel spanish-overview">
   <div><div className="eyebrow light">LANGUAGE HUB · {course.name.toUpperCase()}</div><h2>A new language, the same learning journey.</h2><p>Spanish units are in preparation. Each will follow the English course structure, with original explanations and activities tailored to Spanish. No lessons, answers or scores are simulated.</p></div>
   <div className="course-progress-summary"><strong>ES</strong><span>Course structure ready · content in preparation</span></div>
  </div>
  <div className="section-heading"><div><div className="eyebrow">INSIDE EACH UNIT</div><h2>One connected path</h2></div><span>5 stages · flexible content</span></div>
  <p className="priority-note"><strong>Before and after each unit</strong><span>A suggested video introduces the theme. When a relevant episode is available, a BBC 6 Minute English link follows the English unit. Links are selected with each unit.</span></p>
  <div className="language-flow-grid">{LANGUAGE_UNIT_FLOW.map((step,index)=><article key={step.key} className="language-flow-card"><span>{String(index+1).padStart(2,'0')}</span><h3>{step.label}</h3><p>{step.description}</p></article>)}</div>
  <p role="status" className="priority-note"><strong>Curriculum in preparation</strong><span>Units will be published as their explanations, audio, exercises and assessment are ready. English progress remains separate from Spanish progress.</span></p>
 </section>;
}

function evidenceMessage(status: MemoryStatus) {
  if (status === 'loading') return 'Reading measured learning evidence…';
  if (status === 'unavailable') return 'Measured learning evidence is temporarily unavailable. No placeholder scores are being substituted.';
  if (status === 'other-profile') return 'This profile has separate private learning evidence. Sign in with that learner account to see measured results.';
  return 'Study progress is available without a voice session. Use an evaluated Professor session only when you want a measured capability baseline; until then, the Language Hub will not invent scores or priorities.';
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

function CourseTree({learnerKey,tracks:learnerTracks,catalog,activeTrack,activeLessonId,localProgress,onSelectCourse,onSelectLesson}:{
 learnerKey:LearnerKey;tracks:Track[];catalog:CatalogLesson[];activeTrack:TrackKey|null;activeLessonId:string|null;localProgress:LocalStudyProgress;onSelectCourse:(track:TrackKey)=>void;onSelectLesson:(track:TrackKey,lesson?:CatalogLesson)=>void;
}){
 const [expanded,setExpanded]=useState<Set<TrackKey>>(()=>new Set([primaryVisibleTrack(learnerKey)]));
 const [expandedParts,setExpandedParts]=useState<Set<string>>(()=>new Set(['finance:1']));
 useEffect(()=>{setExpanded(new Set([primaryVisibleTrack(learnerKey)]));setExpandedParts(new Set(['finance:1']));},[learnerKey]);
 const courseLabel=(key:TrackKey)=>key==='finance'?'ACCA':key==='payroll'?'PAYROLL':'ENGLISH';
 const partLabel=(sequence:number)=>`Part ${String.fromCharCode(64+sequence)}`;
 const toggleCourse=(key:TrackKey)=>{
  setExpanded(current=>{const next=new Set(current);if(next.has(key))next.delete(key);else next.add(key);return next;});
  onSelectCourse(key);
 };
 const togglePart=(key:string)=>setExpandedParts(current=>{const next=new Set(current);if(next.has(key))next.delete(key);else next.add(key);return next;});
 return <div className="course-tree" data-testid="course-tree">
  {learnerTracks.map(track=>{
   const lessons=catalog.filter(lesson=>lesson.track===track.key).sort((a,b)=>a.sequence-b.sequence);
   const open=expanded.has(track.key);
   const groups=track.key==='finance'?[...new Set(lessons.map(lesson=>lesson.moduleSequence))]:[];
   return <section className={`course-tree-course ${activeTrack===track.key?'active':''}`} key={track.key}>
    <button className="course-tree-heading" aria-expanded={open} onClick={()=>toggleCourse(track.key)}><span className={`course-tree-icon ${track.key}`}>{track.key==='finance'?'A':track.key==='payroll'?'P':'EN'}</span><strong>{courseLabel(track.key)}</strong><span className="course-tree-chevron">{open?'⌃':'⌄'}</span></button>
    {open?<div className="course-tree-children">
     {track.key==='finance'?groups.map(sequence=>{const key=`${track.key}:${sequence}`,partOpen=expandedParts.has(key);return <div className="course-part" key={key}>
      <button className="course-part-heading" aria-expanded={partOpen} onClick={()=>togglePart(key)}><span>{partLabel(sequence)}</span><small>{partOpen?'−':'+'}</small></button>
      {partOpen?<div className="course-lesson-list">{lessons.filter(lesson=>lesson.moduleSequence===sequence).map(lesson=><CourseLessonButton key={lesson.id} lesson={lesson} active={activeLessonId===lesson.id} completed={!!localProgress.completed[lesson.id]} ready={isCurriculumUnitReady(lesson)} onClick={()=>onSelectLesson(track.key,lesson)}/>)}</div>:null}
     </div>}):<div className="course-lesson-list direct">{lessons.map((lesson,index)=><CourseLessonButton key={lesson.id} lesson={lesson} active={activeLessonId===lesson.id} completed={!!localProgress.completed[lesson.id]} prefix={`Unit ${index+1}`} onClick={()=>onSelectLesson(track.key,lesson)}/>)}</div>}
    </div>:null}
   </section>;
  })}
 </div>;
}

function CourseLessonButton({lesson,active,completed,ready=isCurriculumUnitReady(lesson),prefix,onClick}:{lesson:CatalogLesson;active:boolean;completed:boolean;ready?:boolean;prefix?:string;onClick:()=>void}){
 const concise=lesson.title.replace(/^ACCA FR\s+/,'').replace(/^Unit \d+\s+·\s+/,'');
 const code=lesson.title.match(/ACCA FR ([A-E]\d*)/)?.[1];
 return <button className={`course-lesson-button ${active?'active':''} ${ready?'':'rebuilding'}`} onClick={onClick} title={ready?lesson.title:`${lesson.title} · rebuilding`} disabled={!ready} aria-label={ready?lesson.title:`${lesson.title} — rebuilding`}>
  <span>{completed?'✓':ready?code??prefix:'•••'}</span><strong>{concise}{!ready?<small>Rebuilding</small>:null}</strong>
 </button>;
}

function CourseTabs({track,view,lessonOpen,onOpen}:{track:TrackKey;view:ViewKey;lessonOpen:boolean;onOpen:(view:ViewKey)=>void}){
 const tabs:{label:string;view:ViewKey}[]=[
  {label:'Home',view:'dashboard'},
  {label:'Curriculum',view:'learn'},
  {label:'Error Bank',view:'error-bank'},
  {label:'Performance',view:'performance'},
  ...(track==='finance'?[{label:'Mock Exams',view:'mock-exams' as ViewKey}]:[]),
 ];
 return <nav className="course-tabs" aria-label="Course navigation">{tabs.map(tab=><button key={tab.view} className={(!lessonOpen&&view===tab.view)||(lessonOpen&&tab.view==='learn')?'active':''} onClick={()=>onOpen(tab.view)}>{tab.label}</button>)}</nav>;
}

function CourseHome({trackKey,learnerKey,profile,memory,memoryStatus,openLesson,openView,catalog,localProgress}:{
 trackKey:TrackKey;learnerKey:LearnerKey;profile:LearningProfile;memory:LearningMemorySnapshot|null;memoryStatus:MemoryStatus;openLesson:(key:TrackKey,lesson?:CatalogLesson)=>void;openView:(view:ViewKey)=>void;catalog:CatalogLesson[];localProgress:LocalStudyProgress;
}){
 const readyCatalog=useMemo(()=>readyCurriculumUnits(catalog),[catalog]);
 const readiness=useMemo(()=>readinessSummary(catalog,trackKey),[catalog,trackKey]);
 const reviews=useMemo(()=>buildLocalReviewSchedule(readyCatalog,localProgress,new Date(),trackKey),[readyCatalog,localProgress,trackKey]);
 const due=reviews.filter(item=>item.status==='due').length;
 const trackLessons=useMemo(()=>catalog.filter(lesson=>lesson.track===trackKey).sort((a,b)=>a.sequence-b.sequence),[catalog,trackKey]);
 const readyTrackLessons=useMemo(()=>trackLessons.filter(isCurriculumUnitReady),[trackLessons]);
 const measuredIds=useMemo(()=>new Set(memory?.history.map(session=>session.lessonId)??[]),[memory]);
 const completedCount=readyTrackLessons.filter(lesson=>localProgress.completed[lesson.id]||measuredIds.has(lesson.id)).length;
 const total=trackLessons.length;
 const percent=total?Math.round(completedCount/total*100):0;
 const resumeId=lastOpenedLocalLessonId(localProgress,trackKey);
 const next=readyTrackLessons.find(lesson=>lesson.id===resumeId&&!localProgress.completed[lesson.id]&&!measuredIds.has(lesson.id))??readyTrackLessons.find(lesson=>!localProgress.completed[lesson.id]&&!measuredIds.has(lesson.id))??null;
 const courseName=trackKey==='finance'?'ACCA Financial Reporting':trackKey==='payroll'?'Payroll Academy':'English Academy';
 const description=trackKey==='finance'?'The complete written FR pathway, organised by the public ACCA syllabus and supported by exam practice.':trackKey==='payroll'?'A practical Irish Payroll pathway that transfers Viviane’s DP experience into Revenue workflows, controls and employee communication.':learnerKey==='viviane'?'One English course with alternating everyday and Payroll/People Operations situations in an 80/20 balance.':'One English course combining everyday fluency and technical communication in a 50/50 balance.';
 const filteredErrors=(memory?.errors??[]).filter(error=>trackKey==='english'?error.domain!=='technical':error.domain==='technical');
 const recent=readyTrackLessons.filter(lesson=>!localProgress.completed[lesson.id]&&!measuredIds.has(lesson.id)).slice(0,3);
 const actionLabel=trackKey==='finance'?'Continue Finance':trackKey==='payroll'?'Continue Payroll':'Start English practice';
 return <section className="page-stack course-home" data-testid={`course-home-${trackKey}`}>
  <div className={`course-overview-panel ${trackKey}`}>
   <div><div className="eyebrow light">{courseName.toUpperCase()} · {profile.displayName.toUpperCase()}</div><h2>{next?.title??(readiness.rebuilding?`Current reviewed batch complete`:`${courseName} ready for review`)}</h2><p>{description}</p><div className="hero-actions"><button className="primary-btn" onClick={()=>next?openLesson(trackKey,next):openView('learn')}>{next?actionLabel:'View curriculum status'}</button><button className="secondary-dark-btn" onClick={()=>openView('learn')}>View all units</button></div></div>
   <div className="course-progress-summary"><strong>{percent}%</strong><span>{completedCount} of {total} units complete</span><div className="progress-track"><span style={{width:`${percent}%`}}/></div></div>
  </div>
  {readiness.rebuilding?<p role="status" className="priority-note curriculum-readiness-note"><strong>{readiness.ready} OF {readiness.planned} UNITS DEEP-REVIEWED</strong><span>The complete pathway remains visible. Units marked Rebuilding are intentionally locked until their teaching, practice, feedback, audio script and completion evidence pass the quality gate.</span></p>:null}
  <div className="course-summary-grid">
   <article><span>PROGRESS</span><strong>{completedCount}/{total}</strong><small>units completed</small></article>
   <article><span>REVIEW</span><strong>{due}</strong><small>retrievals due</small></article>
   <article><span>ERROR BANK</span><strong>{filteredErrors.length}</strong><small>{memoryStatus==='ready'?'measured patterns':'awaiting measured evidence'}</small></article>
   <article><span>CONTENT READINESS</span><strong>{readiness.ready}/{readiness.planned}</strong><small>{readiness.rebuilding} planned units rebuilding</small></article>
  </div>
  <section className="course-next-panel"><div className="section-heading"><div><div className="eyebrow">NEXT IN YOUR COURSE</div><h2>A clear path, one unit at a time</h2></div><button className="secondary-btn" onClick={()=>openView('learn')}>Full curriculum</button></div>
   <div className="course-next-list">{recent.length?recent.map((lesson,index)=><button key={lesson.id} onClick={()=>openLesson(trackKey,lesson)}><span>{String(index+1).padStart(2,'0')}</span><div><strong>{lesson.title}</strong><small>{lessonWorkloadLabel(lesson)} · {lesson.subtitle}</small></div><b>→</b></button>):<p className="priority-note local-progress-note"><strong>{readiness.rebuilding?'Reviewed batch complete':'Written pathway complete'}</strong><span>{readiness.rebuilding?`${readiness.rebuilding} planned units remain visible in the curriculum and will unlock only after deep review.`:'Use Revision, Error Bank and Performance to decide what returns next.'}</span></p>}</div>
  </section>
 </section>;
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
  const localReviews=useMemo(()=>buildLocalReviewSchedule(catalog,localProgress),[catalog,localProgress]);
  const dueLocalReviews=localReviews.filter(item=>item.status==='due');
  const englishReviews=useMemo(()=>buildLocalReviewSchedule(catalog,localProgress,new Date(),'english'),[catalog,localProgress]);
  const dueEnglishReviews=englishReviews.filter(item=>item.status==='due');
  const nextLocalReview=dueLocalReviews[0]??localReviews[0]??null;

  return (
    <section className="content-grid dashboard-grid">
      <div className="hero-panel">
        <div className="hero-kicker">{showLocalCourse?`TODAY'S ACCA FOCUS • ${localCourse.completedCount}/${localCourse.total} FINISHED`:`TODAY'S FOCUS • ${profile.displayName.toUpperCase()}`}</div>
        <h2>{dailyLesson?.title??'Build capability, not just knowledge.'}</h2>
        <p>{dailyLesson?`${dailyLesson.subtitle??'Local ACCA self-study lesson'}. ${LOCAL_DEPTH_REVIEW_LABEL}; the unit workload will be republished after the deeper content pass.`:'Saved checkpoints and spaced reviews keep study moving. Optional evaluated sessions add capability evidence; when evidence is missing, the portal says so instead of filling the gap with demo scores.'}</p>
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
          <article className="acca-agenda-card"><span>1 · ACCA FR</span><strong>{dailyLesson?.title??'Review your latest ACCA lesson'}</strong><small>{dailyLesson?`${LOCAL_DEPTH_REVIEW_LABEL}; choose one focused block today.`:'Curriculum complete — use a marked lesson for retrieval.'}</small><button className="primary-btn" onClick={()=>dailyLesson?openLesson('finance',dailyLesson):openView('revision')}>{dailyLesson?dailyAction:'Open revision'}</button></article>
          <article className="acca-agenda-card"><span>2 · ENGLISH</span><strong>{englishCourse.nextLesson?.title??'Review your latest English lesson'}</strong><small>{englishCourse.nextLesson?`${LOCAL_DEPTH_REVIEW_LABEL} · keep the 50/50 everyday/professional sequence moving.`:'Eight-lesson local core complete.'}</small><button className="primary-btn" onClick={()=>englishCourse.nextLesson?openLesson('english',englishCourse.nextLesson):openView('english-academy')}>{englishCourse.nextLesson?'Open English block':'Open English Academy'}</button></article>
          <article className={`acca-agenda-card ${dueLocalReviews.length+dueEnglishReviews.length?'review-due':''}`}><span>3 · RETRIEVE OR TEST</span><strong>{dueLocalReviews.length+dueEnglishReviews.length?`${dueLocalReviews.length+dueEnglishReviews.length} spaced review${dueLocalReviews.length+dueEnglishReviews.length===1?'':'s'} due`:'ACCA FR Mini Mock series'}</strong><small>{dueLocalReviews.length+dueEnglishReviews.length?'Clear due D+1, D+7 or D+30 retrieval before adding more new material.':'No local review is due; choose one of two complementary 30-minute mocks.'}</small><button className="secondary-btn" onClick={()=>openView(dueLocalReviews.length+dueEnglishReviews.length?'revision':'mock-exams')}>{dueLocalReviews.length+dueEnglishReviews.length?'Open reviews':'Open mocks'}</button></article>
        </div>
      </section>:null}

      {showLocalCourse?<section className="acca-study-board full-span" data-testid="acca-study-board">
        <div className="section-heading"><div><div className="eyebrow">ACCA DAILY AGENDA</div><h2>Study, retrieve and keep the whole FR syllabus moving</h2></div><span>Local plan · no provider calls</span></div>
        <div className="acca-agenda-grid">
          <article className="acca-agenda-card"><span>NEW LEARNING</span><strong>{dailyLesson?.title??'Curriculum completed'}</strong><small>{dailyLesson?LOCAL_DEPTH_REVIEW_LABEL:'All 23 lessons are available for review.'}</small>{dailyLesson?<button className="primary-btn" onClick={()=>openLesson('finance',dailyLesson)}>{dailyAction}</button>:null}</article>
          <article className={`acca-agenda-card ${dueLocalReviews.length?'review-due':''}`}><span>SPACED RETRIEVAL</span><strong>{dueLocalReviews.length?`${dueLocalReviews.length} review${dueLocalReviews.length===1?'':'s'} due`:nextLocalReview?`Next: ${nextLocalReview.stage} on ${shortDate(nextLocalReview.dueAt)}`:'Complete A1 to schedule reviews'}</strong><small>{nextLocalReview?nextLocalReview.lesson.title:'D+1, D+7 and D+30 appear automatically after completion.'}</small><button className="secondary-btn" onClick={()=>openView('revision')}>{dueLocalReviews.length?'Open due reviews':'View review plan'}</button></article>
          <article className="acca-agenda-card"><span>WEEKLY PACE</span><strong>{localCourse.completedLast7Days}/{localCourse.weeklyTarget} lessons</strong><small>{LOCAL_DEPTH_REVIEW_LABEL} · about {localCourse.estimatedWeeksRemaining} week{localCourse.estimatedWeeksRemaining===1?'':'s'} at the suggested pace</small><div className="progress-track" aria-label={`${localCourse.completedLast7Days} of ${localCourse.weeklyTarget} weekly lessons`}><span style={{width:`${Math.min(100,localCourse.completedLast7Days/localCourse.weeklyTarget*100)}%`}} /></div></article>
        </div>
        <div className="acca-module-grid" aria-label="ACCA progress by syllabus module">{localCourse.modules.map(module=><article key={module.code} className="acca-module-card"><div><b>{module.code}</b><span>{module.label}</span></div><strong>{module.completedCount}/{module.total}</strong><div className="progress-track"><span style={{width:`${module.percent}%`}} /></div><small>{module.remainingMinutes?LOCAL_DEPTH_REVIEW_LABEL:'Module completed'}</small></article>)}</div>
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
          <p>Checkpoints record study progress. Optional evaluated conversations can add capability evidence; confirmed weak points and recurring mistakes return through the Error Bank and spaced reviews.</p>
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

function LearningLibrary({ learnerKey,trackKey,catalog, catalogUnavailable, openLesson,localProgress }: { learnerKey: LearnerKey;trackKey:TrackKey; catalog: CatalogLesson[]; catalogUnavailable:boolean; openLesson: (key: TrackKey,lesson?:CatalogLesson) => void;localProgress:LocalStudyProgress }) {
  const available=catalog.filter(lesson=>lesson.track===trackKey).sort((a,b)=>a.sequence-b.sequence);
  const ready=available.filter(isCurriculumUnitReady);
  const course=summarizeLocalCourse(ready,localProgress,trackKey);
  const readiness=readinessSummary(catalog,trackKey);
  const courseName=trackKey==='finance'?'ACCA Financial Reporting':trackKey==='payroll'?'Payroll Academy':'English Academy';
  const fallbackTrack=tracks.find(track=>track.key===trackKey)!;
  return <section className="page-stack" data-testid="learning-library">
    <div className="section-heading"><div><div className="eyebrow">{courseName.toUpperCase()} · CURRICULUM</div><h2>{trackKey==='finance'?'Parts and syllabus units':trackKey==='payroll'?'Irish Payroll learning pathway':'One alternating sequence of English units'}</h2></div><span>{readiness.ready} ready · {readiness.rebuilding} rebuilding</span></div>
    {available.some(lesson=>lesson.origin==='local-model')&&<p role="status" className="priority-note curriculum-readiness-note" data-testid="local-curriculum-preview"><strong>Account-synced curriculum · {course.completedCount}/{readiness.planned} deep-reviewed units complete</strong><span>The complete course plan is visible. Only the {readiness.ready} unit{readiness.ready===1?'':'s'} with a passed deep-content gate can be opened; the others remain locked while being rebuilt. Draft written answers are not stored.</span></p>}
    {catalogUnavailable&&<p role="status" className="priority-note"><strong>Catalog temporarily unavailable</strong><span>Verified Golden Lessons from your visible tracks remain available as a safe fallback.</span></p>}
    <div className="library-grid">
      {available.length?available.map((lesson,index)=>{const base=tracks.find(t=>t.key===lesson.track)!;const unitReady=isCurriculumUnitReady(lesson);const completion=unitReady?localProgress.completed[lesson.id]:undefined;const isResume=unitReady&&lastOpenedLocalLessonId(localProgress,lesson.track)===lesson.id&&!completion;return <article className={`lesson-library-card primary-track-card ${completion?'lesson-locally-complete':''} ${unitReady?'':'lesson-rebuilding'}`} key={lesson.id} data-testid={`catalog-lesson-${lesson.slug}`}>
        <div className="lesson-index">{String(index+1).padStart(2,'0')}</div><span className={`track-badge ${lesson.track}`}>{base.accent}</span><h3>{lesson.title}</h3><p>{lesson.subtitle??base.focus}</p><div className="lesson-meta"><span>{lessonWorkloadLabel(lesson)}</span><span>{base.name}</span><span>{completion?`Finished · ${completion.correct}/${completion.total}`:unitReady?'Deep-reviewed self-study':'Teaching, practice and audio under review'}</span></div><button className={unitReady?'primary-btn':'secondary-btn'} disabled={!unitReady} onClick={()=>openLesson(lesson.track,lesson)}>{unitReady?(completion?'Review lesson':isResume?'Resume lesson':'Open lesson'):'Rebuilding'}</button>
      </article>}):<article className="lesson-library-card primary-track-card"><div className="lesson-index">01</div><span className={`track-badge ${fallbackTrack.key}`}>{fallbackTrack.accent}</span><h3>{fallbackTrack.lesson}</h3><p>{fallbackTrack.focus}</p><div className="lesson-meta"><span>10–15 min</span><span>Verified fallback</span><span>Professor</span></div><button className="primary-btn" onClick={()=>openLesson(fallbackTrack.key)}>Open Golden Lesson</button></article>}
    </div>
  </section>;
}

const lessonTabsFor=(track:TrackKey,deepLocal=false):readonly {label:string;key:string}[]=>track==='english'?
 LANGUAGE_UNIT_FLOW.map(({label,key})=>({label,key})):deepLocal?
 [{label:'Learn',key:'Learn'},{label:'Audio',key:'Audio'},{label:'Practice',key:'Practice'},{label:'Sources',key:'Sources'}]:track==='payroll'?
 [{label:'Learn',key:'Learn'},{label:'Audio',key:'Audio'},{label:'Calculation',key:'Visual'},{label:'Practice',key:'Practice'},{label:'Speaking',key:'Speaking'},{label:'Case',key:'Case'},{label:'Test',key:'Test'},{label:'Sources',key:'Sources'}]:
 [{label:'Learn',key:'Learn'},{label:'Audio',key:'Audio'},{label:'Practice',key:'Practice'},{label:'Visual',key:'Visual'},{label:'Case',key:'Case'},{label:'Test',key:'Test'},{label:'Sources',key:'Sources'}];

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
  const [listenedLessonId,setListenedLessonId]=useState<string|null>(null);
  const deepLocal=track.origin==='local-model';
  const tabs=lessonTabsFor(track.key,deepLocal);
  const professorProviderLessonId=track.key==='english'?(deepProfessorProviderLessonId(track.lessonId)??(interactiveLessonSupported?track.lessonId:null)):null;
  const lessonProfessorEnabled=professorProviderLessonId!==null;
  const lessonAudioEnabled=interactiveLessonSupported||deepInteractiveAudioLesson(track.lessonId);
  const prepareWorkshop=(id:string)=>{
    if(conversationBusy||!canUseActions||!lessonProfessorEnabled||!WORKSHOP_CASES[track.key].some(c=>c.id===id))return;
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
        {tabs.map((tab) => (
          <button key={tab.label} role="tab" aria-selected={activeTab === tab.key} className={activeTab === tab.key ? 'active' : ''} onClick={() => setActiveTab(tab.key)}>{tab.label}</button>
        ))}
      </div>
      <div className={`lesson-layout ${activeTab==='Audio'?'lesson-layout-audio':''} ${deepLocal&&track.key==='english'&&activeTab==='Learn'?'lesson-layout-focused':''}`}>
        <article className="lesson-content-card">
          <div className="track-card-head"><span className={`track-badge ${track.key}`}>{track.accent}</span><span className="readiness-pill">{track.origin==='local-model'?'Account-synced · reviewed unit':'Premium lesson'}</span></div>
          <div className="eyebrow">{activeTab.toUpperCase()}</div>
          {lessonProfessorEnabled?<LessonProfessorWorkspace track={track.key} lessonId={professorProviderLessonId!} learnerKey={learnerKey} activeTab={activeTab} onTabChange={setActiveTab} onActivityChange={setConversationBusy} workshopId={workshopId} onClearWorkshop={clearWorkshop}/>:null}
          <LessonStudyPanel key={track.lessonId} track={track.key} lessonId={track.lessonId} lessonSlug={track.lessonSlug} activeTab={activeTab} onTabChange={setActiveTab} onPrepareWorkshop={track.key==='english'?prepareWorkshop:undefined} handoffDisabled={conversationBusy||!canUseActions||!lessonProfessorEnabled} readerDisabled={conversationBusy||!canUseActions} audioListened={listenedLessonId===track.lessonId} localCompletion={localCompletion} onCompleteLocal={onCompleteLocal} nextLessonTitle={nextLocalLesson?.title} onOpenNextLesson={onOpenNextLocal} localReviewStage={localReviewStage} localReviewCompletion={localReviewCompletion} audioPlayer={lessonAudioEnabled && activeTab==='Audio' ? (conversationBusy ? <p role="status" data-testid="audio-conversation-guard">End the Professor session before playing lesson audio. Written tabs remain available.</p> : canUseActions ? <PremiumAudioPanel lessonId={track.lessonId} lessonTitle={track.lesson} reviewedVoicesPending={track.key==='english'&&deepInteractiveAudioLesson(track.lessonId)&&!isFeatureEnabled('englishReviewedAudio')} onPlaybackComplete={()=>setListenedLessonId(track.lessonId)}/> : <p role="status" data-testid="audio-account-mismatch">Audio actions require the matching signed-in learner account.</p>) : null} />
          {!interactiveLessonSupported && !deepLocal && (activeTab === 'Audio' || activeTab === 'Professor') ? <p role="status" data-testid="p1-interactive-gate">{activeTab==='Audio'&&track.key!=='payroll'&&isP1Slug(track.key,track.lessonSlug)?'Verify this lesson below to access its Premium Audio controls.':activeTab==='Audio'?'The independent Audio episode is not yet available for this unit.':'The written English unit is ready. Its live Professor session will appear here after the published lesson is activated.'}</p> : null}
          {!interactiveLessonSupported && !deepLocal && canUseActions && isP1Slug(track.key,track.lessonSlug) && (activeTab === 'Audio' || activeTab === 'Professor') ? <LessonReadinessCheck key={[account.userId,track.key,track.lessonId,track.lessonSlug].join(':')} userId={account.userId} lessonId={track.lessonId} lessonSlug={track.lessonSlug} lessonTitle={track.lesson} track={track.key} activeTab={activeTab}/> : null}
          {/* Interactive providers are mounted only for lessons with a reviewed server handoff. */}
        </article>
        <aside className="lesson-side-card" hidden={activeTab==='Audio'||deepLocal&&track.key==='english'&&activeTab==='Learn'}>
          <div className="eyebrow">MEASURED LEARNING SIGNALS</div>
          <h3>{measuredSession ? 'Latest evaluated evidence' : 'Baseline pending'}</h3>
          {localCompletion?<div className="priority-note local-progress-note"><strong>Finished and saved to your account</strong><span>{localCompletion.correct}/{localCompletion.total} checkpoint answers correct in the saved attempt · practice completion only, not measured mastery.</span></div>:null}
          {measuredScores.length > 0
            ? measuredScores.map(([label, value]) => <Signal key={label} label={label} value={Math.round(value)} />)
            : <div className="priority-note"><strong>No synthetic score</strong><span>{track.key==='english'?'Complete an evaluated English Professor session to create capability scores.':'Finish the checkpoint for study progress. Optional Professor debriefs create separate evaluated evidence.'}</span></div>}
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
  const readyCatalog=useMemo(()=>readyCurriculumUnits(catalog),[catalog]);
  const course=useMemo(()=>summarizeLocalCourse(readyCatalog,localProgress,'english'),[readyCatalog,localProgress]);
  const readiness=useMemo(()=>readinessSummary(catalog,'english'),[catalog]);
  const nextLesson=course.lessons.find(lesson=>!localProgress.completed[lesson.id])??null;
  const resuming=!course.allCompleted&&!!nextLesson&&lastOpenedLocalLessonId(localProgress,'english')===nextLesson.id;
  const action=course.allCompleted?'Review final English lesson':resuming?'Resume English lesson':'Start English lesson';
  const reviews=useMemo(()=>buildLocalReviewSchedule(readyCatalog,localProgress,new Date(),'english'),[readyCatalog,localProgress]);
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

      {readiness.rebuilding?<p role="status" className="priority-note curriculum-readiness-note"><strong>{readiness.ready} OF {readiness.planned} ENGLISH UNITS DEEP-REVIEWED</strong><span>The everyday and technical sequence stays visible, but a unit unlocks only after Learn, Audio, Grammar, Practice, Speaking and completion evidence pass review.</span></p>:null}

      {course.total>0?<section className="acca-study-board english-study-board" data-testid="english-study-board">
        <div className="section-heading"><div><div className="eyebrow">ENGLISH DAILY AGENDA</div><h2>Build everyday fluency and professional confidence together</h2></div><span>{profile.english.curriculumMix.everydayPct}/{profile.english.curriculumMix.professionalPct} profile plan · no provider calls</span></div>
        <div className="acca-agenda-grid">
          <article className="acca-agenda-card"><span>NEXT LESSON</span><strong>{nextLesson?.title??'Core completed'}</strong><small>{nextLesson?`${lessonWorkloadLabel(nextLesson)} · progress syncs with your account`:'All lessons remain available for review.'}</small>{nextLesson?<button className="primary-btn" onClick={()=>openLesson('english',nextLesson)}>{action}</button>:null}</article>
          <article className="acca-agenda-card"><span>{profile.english.curriculumMix.everydayPct} / {profile.english.curriculumMix.professionalPct} BALANCE</span><strong>{everyday?.total??0} everyday · {professional?.total??0} {profile.english.curriculumMix.professionalLabel}</strong><small>{learnerKey==='viviane'?'Four everyday lessons and one Payroll/People Operations lesson per week.':'The monthly sequence keeps everyday and technical English equally represented.'}</small><button className="secondary-btn" onClick={()=>openView('learn')}>View English lessons</button></article>
          <article className={`acca-agenda-card ${dueReviews?'review-due':''}`}><span>SPACED RETRIEVAL</span><strong>{dueReviews?`${dueReviews} review${dueReviews===1?'':'s'} due`:'D+1 · D+7 · D+30'}</strong><small>{course.completedCount?`${course.completedCount}/${course.total} lessons finished`:'Finish the first lesson to start the review cycle.'}</small><button className="secondary-btn" onClick={()=>openView('revision')}>{dueReviews?'Open due reviews':'View review plan'}</button></article>
        </div>
        <div className="acca-module-grid" aria-label="English progress by balance area">{course.modules.map(module=><article key={module.code} className="acca-module-card"><div><b>{module.code}</b><span>{module.label}</span></div><strong>{module.completedCount}/{module.total}</strong><div className="progress-track"><span style={{width:`${module.percent}%`}} /></div><small>{module.remainingMinutes?LOCAL_DEPTH_REVIEW_LABEL:'Area completed'}</small></article>)}</div>
      </section>:null}

      <div className="academy-grid">
        <article className="academy-card wide-academy-card">
          <div className="eyebrow">{learnerKey==='viviane'?`WEEK ${currentVivianeWeek} · 4 EVERYDAY + 1 PROFESSIONAL`:'THIS WEEK'}</div>
          <h3>Short, varied sessions that convert input into speech</h3>
          <div className="academy-week">
            {(learnerKey==='viviane'?currentVivianeWeekLessons.map((lesson,index)=>({day:index+1,title:lesson.title,primarySkills:[lesson.moduleSequence===1?'everyday':'Payroll & People Ops'],minutes:lesson.estimatedMinutes,optional:false})):DEFAULT_WEEK).map((session) => (
              <div className="academy-session" key={session.day}>
                <span>D{session.day}</span><div><strong>{session.title}</strong><small>{session.primarySkills.join(' • ')} • {course.total?LOCAL_DEPTH_REVIEW_LABEL:`${session.minutes} min`}{session.optional ? ' • optional' : ''}</small></div>
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
  const readyCatalog=useMemo(()=>readyCurriculumUnits(catalog),[catalog]);
  const localCourse=useMemo(()=>summarizeLocalCourse(readyCatalog,localProgress,track),[readyCatalog,localProgress,track]);
  const localReviews=useMemo(()=>buildLocalReviewSchedule(readyCatalog,localProgress,new Date(),track),[readyCatalog,localProgress,track]);
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

function RevisionView({ catalog, localProgress, openLocalReview }: {catalog:CatalogLesson[];localProgress:LocalStudyProgress;openLocalReview:(item:LocalReviewItem)=>void }) {
  return (
    <section className="page-stack">
      <LocalReviewSection track="english" label="English" catalog={catalog} localProgress={localProgress} openLocalReview={openLocalReview}/>
      <p className="priority-note"><strong>English review only</strong><span>Only English units appear here. Older technical review records remain preserved outside the active portal.</span></p>
    </section>
  );
}

function ErrorBankView({trackKey,memory, memoryStatus }: {trackKey:TrackKey;memory: LearningMemorySnapshot | null; memoryStatus: MemoryStatus }) {
  const errors = (memory?.errors ?? []).filter(error=>trackKey==='english'?error.domain!=='technical':error.domain==='technical');
  const pending=errors.filter(error=>error.frequency<=1).length;
  const active=errors.filter(error=>error.frequency>1).length;
  const courseName=trackKey==='finance'?'ACCA':trackKey==='payroll'?'Payroll':'English';
  return (
    <section className="page-stack" data-testid="error-bank-view">
      <div className="section-heading"><div><div className="eyebrow">{courseName.toUpperCase()} · ERROR BANK</div><h2>Only repeated mistakes become active priorities</h2></div><span>{errors.length} measured pattern{errors.length===1?'':'s'}</span></div>
      <div className="error-state-strip"><span><b>{pending}</b> To confirm</span><span><b>{active}</b> Active</span><span><b>0</b> Resolved</span></div>
      <div className="error-bank-summary"><strong>Automatic entry rule</strong><span>A first isolated mistake stays “To confirm”. It becomes Active only after repetition or strong evaluated evidence. A successful spaced retrieval can move it to Resolved.</span></div>
      {errors.length === 0 ? <div className="adaptive-priority-stack"><EmptyEvidence status={memoryStatus} /></div> : (
        <div className="error-bank-grid">
          {errors.map((error) => (
            <article className="error-bank-card" key={error.id}>
              <div className="error-bank-head"><span className={`error-domain ${error.domain}`}>{error.domain}</span><b className={error.frequency>1?'state-active':'state-confirm'}>{error.frequency>1?'Active':'To confirm'}</b></div>
              <h3>{error.pattern}</h3>
              <div className="confidence-track"><span style={{ width: `${Math.max(0, Math.min(100, error.confidence))}%` }} /></div>
              <div className="error-meta"><span>{error.frequency} occurrence{error.frequency===1?'':'s'}</span><span>Next retrieval {shortDate(error.nextReviewAt)}</span></div>
              <button className="secondary-btn" disabled>{error.frequency>1?'Practice scheduled':'Waiting for confirmation'}</button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function PerformanceView({trackKey,catalog,localProgress,memory, memoryStatus }: {trackKey:TrackKey;catalog:CatalogLesson[];localProgress:LocalStudyProgress;memory: LearningMemorySnapshot | null; memoryStatus: MemoryStatus }) {
  const languageLabels=/english|grammar|vocabulary|fluency|pronunciation|communication|register/i;
  const competencyValues = (memory?.competencies ?? []).filter(item=>trackKey==='english'?languageLabels.test(`${item.name} ${item.category}`):!languageLabels.test(`${item.name} ${item.category}`)).map((item) => ({
    label: item.name,
    value: item.score,
    detail: `${item.evidenceCount} evidence • ${Math.round(item.confidence)}% confidence`,
  }));
  const latestValues = memory?.latest
    ? scorePairs(memory.latest).map(([label, value]) => ({ label, value, detail: 'Latest evaluated Professor session' }))
    : [];
  const values = competencyValues.length > 0 ? competencyValues : latestValues;
  const course=summarizeLocalCourse(catalog,localProgress,trackKey);
  const courseName=trackKey==='finance'?'ACCA':trackKey==='payroll'?'Payroll':'English';

  return (
    <section className="page-stack">
      <div className="section-heading"><div><div className="eyebrow">{courseName.toUpperCase()} · PERFORMANCE</div><h2>Progress and measured capability, kept separate</h2></div><span>{memory?.history.length ?? 0} evaluated session{(memory?.history.length ?? 0) === 1 ? '' : 's'}</span></div>
      <div className="course-summary-grid performance-summary"><article><span>CURRICULUM</span><strong>{course.percent}%</strong><small>{course.completedCount}/{course.total} units completed</small></article><article><span>CHECKPOINTS</span><strong>{catalog.filter(lesson=>lesson.track===trackKey&&localProgress.completed[lesson.id]).length}</strong><small>saved lesson attempts</small></article><article><span>MEASURED SESSIONS</span><strong>{memory?.history.length??0}</strong><small>Professor evaluations</small></article><article><span>EVIDENCE STATUS</span><strong>{values.length}</strong><small>capabilities with a score</small></article></div>
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
      <div className="error-bank-summary"><strong>Interpretation</strong><span>Course completion records study progress. Capability scores require evaluated evidence. Neither is presented as an external employability or exam-readiness guarantee.</span></div>
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
          <div className="eyebrow light">ASK THE PROFESSOR • {profile.displayName.toUpperCase()}</div>
          <h2>Use a live session when a doubt or debrief deserves conversation.</h2>
          <p>{profile.professor.style} Use the Professor to discuss the English unit and receive feedback on how clearly you communicate.</p>
          <div className="hero-actions"><button className="primary-btn" onClick={() => openLesson(primaryTrack)}>Open {track.name} lesson</button></div>
        </div>
      </div>
      <div className="wide-card">
        <div><div className="eyebrow">OPTIONAL LIVE SESSION</div><h3>{track.lesson}</h3><p>Bring a specific doubt, ask for another explanation or debrief a completed exercise. Your written lesson remains complete without this session.</p></div>
        <ProfessorSessionPanel lessonId={track.lessonId} track={track.key} learnerKey={learnerKey} />
      </div>
    </section>
  );
}

function titleForCourseView(view:ViewKey,track:Track){
 if(view==='revision')return 'Revision queue';
 if(view==='professor')return 'Ask the Professor';
 if(view==='mock-exams')return 'ACCA FR Mock Engine';
 if(view==='error-bank')return `${track.key==='finance'?'ACCA':track.key==='payroll'?'Payroll':'English'} Error Bank`;
 if(view==='performance')return `${track.key==='finance'?'ACCA':track.key==='payroll'?'Payroll':'English'} Performance`;
 if(view==='learn')return `${track.name} Curriculum`;
 return track.name;
}

function subtitleForCourseView(view:ViewKey,profile:LearningProfile,track:Track){
 if(view==='revision')return 'Scheduled retrieval across your courses, based on saved completion and measured evidence.';
 if(view==='professor')return 'Optional technical support for doubts and debriefs; English conversation stays inside each English unit.';
 if(view==='mock-exams')return 'Timed exam practice with transparent local marking and debriefs.';
 if(view==='error-bank')return 'This course keeps its own confirmed patterns, review state and recovery path.';
 if(view==='performance')return 'Study progress and evaluated capability are shown separately.';
 if(view==='learn')return `All ${track.name} units in one clear sequence.`;
 return `${profile.displayName}'s next action, progress and review status for this course.`;
}

export default App;
