import fs from 'node:fs';
if(process.env.GITHUB_REF_NAME!=='feat/professor-experience-2026-09-13')throw new Error('wrong_branch');
const path='src/App.tsx';let s=fs.readFileSync(path,'utf8');
const replace=(before,after)=>{if(s.includes(after))return;if(s.split(before).length!==2)throw new Error('catalog_anchor_not_unique:'+before.slice(0,70));s=s.replace(before,after);};
replace("import {WORKSHOP_CASES} from './learning/appliedPractice';", "import {WORKSHOP_CASES} from './learning/appliedPractice';\nimport {loadPublishedCurriculumCatalog,type CatalogLesson} from './services/curriculumCatalog';\nimport {lessonsForTrack,chooseNextPublishedLesson} from './learning/curriculumCatalogCore';\nimport {p1SlugFor} from './learning/p1RuntimeModules';");
replace("  lessonId: string;\n  focus: string;", "  lessonId: string;\n  lessonSlug: string;\n  focus: string;");
replace("    lessonId: 'b3639582-3c32-4147-a4b3-84237d11a66e',", "    lessonId: 'b3639582-3c32-4147-a4b3-84237d11a66e',\n    lessonSlug: 'ifrs-18-group-reporting-irish-statutory',");
replace("    lessonId: '6ffda415-3b18-46ab-afaa-414f81a7eb31',", "    lessonId: '6ffda415-3b18-46ab-afaa-414f81a7eb31',\n    lessonSlug: 'gross-to-net-rpn-paye-usc-prsi',");
replace("    lessonId: 'f455a740-f50f-4eb7-95a7-9e4129ca4a68',", "    lessonId: 'f455a740-f50f-4eb7-95a7-9e4129ca4a68',\n    lessonSlug: 'story-past-forms-rhythm-follow-up',");
replace("  const [memoryError, setMemoryError] = useState(false);", "  const [memoryError, setMemoryError] = useState(false);\n  const [catalog,setCatalog]=useState<CatalogLesson[]>([]);\n  const [catalogUnavailable,setCatalogUnavailable]=useState(false);\n  const [selectedCatalogLesson,setSelectedCatalogLesson]=useState<CatalogLesson|null>(null);");
replace("  const activeTrack = useMemo(() => tracks.find((t) => t.key === trackKey) ?? tracks[0], [trackKey]);", `  const supportedCatalog=useMemo(()=>catalog.filter((lesson)=>{const base=tracks.find(t=>t.key===lesson.track);return !!base&&(lesson.id===base.lessonId||lesson.slug===p1SlugFor(lesson.track));}),[catalog]);
  const activeTrack = useMemo(() => {
    const base=tracks.find((t)=>t.key===trackKey)??tracks[0];
    const selected=selectedCatalogLesson?.track===trackKey?selectedCatalogLesson:null;
    return selected?{...base,lesson:selected.title,lessonId:selected.id,lessonSlug:selected.slug,focus:selected.subtitle??base.focus}:base;
  },[trackKey,selectedCatalogLesson]);`);
replace("  useEffect(() => {\n    void refreshMemory();\n    return () => { memoryRequest.current++; };\n  }, [refreshMemory]);", `  useEffect(() => {
    void refreshMemory();
    return () => { memoryRequest.current++; };
  }, [refreshMemory]);

  useEffect(()=>{
    const controller=new AbortController();setCatalogUnavailable(false);
    void loadPublishedCurriculumCatalog(controller.signal).then(setCatalog).catch(()=>{if(!controller.signal.aborted){setCatalog([]);setCatalogUnavailable(true);}});
    return ()=>controller.abort();
  },[account.userId]);`);
replace("  const openLesson = (key: TrackKey) => {\n    setTrackKey(key);\n    setLessonTab('Learn');", `  const openLesson = (key: TrackKey,lesson?:CatalogLesson) => {
    const measured=new Set((visibleMemory?.history??[]).map(x=>x.lessonId));
    const resolved=lesson??chooseNextPublishedLesson(supportedCatalog,key,measured);
    setSelectedCatalogLesson(resolved??null);
    setTrackKey(key);
    setLessonTab('Learn');`);
replace("    setTrackKey(key === 'viviane' ? 'payroll' : 'finance');", "    setTrackKey(key === 'viviane' ? 'payroll' : 'finance');\n    setSelectedCatalogLesson(null);");
replace("          <LearningLibrary learnerKey={learnerKey} openLesson={openLesson} />", "          <LearningLibrary learnerKey={learnerKey} catalog={supportedCatalog} catalogUnavailable={catalogUnavailable} openLesson={openLesson} />");
replace("          <LessonStudyPanel key={track.lessonId} track={track.key} lessonId={track.lessonId}", "          <LessonStudyPanel key={track.lessonId} track={track.key} lessonId={track.lessonId} lessonSlug={track.lessonSlug}");
const start=s.indexOf('function LearningLibrary('),end=s.indexOf('\nfunction LessonView(',start);
if(start<0||end<start)throw new Error('learning_library_boundary_missing');
const library=`function LearningLibrary({ learnerKey, catalog, catalogUnavailable, openLesson }: { learnerKey: LearnerKey; catalog: CatalogLesson[]; catalogUnavailable:boolean; openLesson: (key: TrackKey,lesson?:CatalogLesson) => void }) {
  const primaryTrack=learnerKey==='viviane'?'payroll':'finance';
  const available=catalog.length?catalog:[];
  return <section className="page-stack" data-testid="learning-library">
    <div className="section-heading"><div><div className="eyebrow">LEARNING LIBRARY</div><h2>Published lessons with reviewed runtime content</h2></div><span>{available.length||3} available now</span></div>
    {catalogUnavailable&&<p role="status" className="priority-note"><strong>Catalog temporarily unavailable</strong><span>The three verified Golden Lessons remain available as a safe fallback.</span></p>}
    <div className="library-grid">
      {available.length?available.map((lesson,index)=>{const base=tracks.find(t=>t.key===lesson.track)!;return <article className={\`lesson-library-card \${lesson.track===primaryTrack?'primary-track-card':''}\`} key={lesson.id} data-testid={\`catalog-lesson-\${lesson.slug}\`}>
        <div className="lesson-index">{String(index+1).padStart(2,'0')}</div><span className={\`track-badge \${lesson.track}\`}>{base.accent}</span><h3>{lesson.title}</h3><p>{lesson.subtitle??base.focus}</p><div className="lesson-meta"><span>{lesson.estimatedMinutes} min</span><span>{base.name}</span><span>Professor</span></div><button className="primary-btn" onClick={()=>openLesson(lesson.track,lesson)}>Open lesson</button>
      </article>}):tracks.map((track,index)=><article className={\`lesson-library-card \${track.key===primaryTrack?'primary-track-card':''}\`} key={track.key}><div className="lesson-index">0{index+1}</div><span className={\`track-badge \${track.key}\`}>{track.accent}</span><h3>{track.lesson}</h3><p>{track.focus}</p><div className="lesson-meta"><span>10–15 min</span><span>Verified fallback</span><span>Professor</span></div><button className="primary-btn" onClick={()=>openLesson(track.key)}>Open Golden Lesson</button></article>)}
    </div>
  </section>;
}
`;
s=s.slice(0,start)+library+s.slice(end);
fs.writeFileSync(path,s);
console.log('Dynamic catalog integrated with authored-runtime allowlist and static fallback. No database write or publish action.');
