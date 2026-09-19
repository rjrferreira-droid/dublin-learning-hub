import fs from 'node:fs';
if(process.env.GITHUB_REF_NAME!=='feat/professor-experience-2026-09-13')throw new Error('wrong_branch');
function edit(file,before,after){const s=fs.readFileSync(file,'utf8');if(s.includes(after))return;if(s.split(before).length!==2)throw new Error('handoff_anchor:'+file+':'+before.slice(0,80));fs.writeFileSync(file,s.replace(before,after));}
function prepend(file,line){const s=fs.readFileSync(file,'utf8');if(!s.includes(line))fs.writeFileSync(file,line+'\n'+s);}
const api='api/livekit-token.ts';
prepend(api,"import {parseWorkshopSelection,selectedWorkshop} from '../src/learning/workshopSelection.js';");
edit(api,"  catch { return send(res,400,{error:'invalid_session_preparation'}); }",`  catch { return send(res,400,{error:'invalid_session_preparation'}); }
  let workshopSelection: ReturnType<typeof parseWorkshopSelection>;
  try { workshopSelection=parseWorkshopSelection(body.workshopSelection); }
  catch { return send(res,400,{error:'invalid_workshop_selection'}); }`);
edit(api,"  if (!requestedLearnerMatchesAccount(learnerProfile.learner_track,body.learnerId)) return send(res,403,{error:'professor_learner_mismatch'});",`  if (!requestedLearnerMatchesAccount(learnerProfile.learner_track,body.learnerId)) return send(res,403,{error:'professor_learner_mismatch'});
  try { selectedWorkshop(profileForTrack(track),workshopSelection); }
  catch { return send(res,403,{error:'workshop_track_mismatch'}); }`);
edit(api,'      requestedLessonId: lessonId, resolvedLessonId: persistenceLessonId,','      requestedLessonId: lessonId, resolvedLessonId: persistenceLessonId,\n      workshopSelection,');
edit(api,"  } catch {\n    return send(res, 503, {error:'written_lesson_context_unavailable'});\n  }", "  } catch (cause) {\n    if(cause instanceof Error && cause.message==='workshop_lesson_mismatch')return send(res,409,{error:'workshop_lesson_mismatch'});\n    return send(res, 503, {error:'written_lesson_context_unavailable'});\n  }");
edit(api,'    sessionPreparation,\n    budgetReservationId:', '    sessionPreparation,\n    workshopSelection,\n    budgetReservationId:');
edit(api,'      sessionPreparation: writtenLesson ? sessionPreparation : null,','      sessionPreparation: writtenLesson ? sessionPreparation : null,\n      workshopSelection,');
prepend('src/services/contracts.ts',"import type {WorkshopSelection} from '../learning/workshopSelection.js';");
edit('src/services/contracts.ts','  sessionPreparation?: SessionPreparation;','  sessionPreparation?: SessionPreparation;\n  workshopSelection?: WorkshopSelection;');
const client='src/professor/livekitProfessor.ts';
prepend(client,"import {sameWorkshopSelection} from '../learning/workshopSelection';");
edit(client,'sessionPreparation:request.sessionPreparation})','sessionPreparation:request.sessionPreparation,workshopSelection:request.workshopSelection})');
edit(client,' return body as ProfessorTokenResponse;'," if(!sameWorkshopSelection(request.workshopSelection,body.workshopSelection))throw new Error('Workshop reference could not be confirmed. No microphone was opened.');\n return body as ProfessorTokenResponse;");
const app='src/App.tsx';
prepend(app,"import {WORKSHOP_CASES} from './learning/appliedPractice';");
edit(app,'  const [conversationBusy,setConversationBusy]=useState(false);',`  const [conversationBusy,setConversationBusy]=useState(false);
  const [workshopId,setWorkshopId]=useState<string|undefined>();
  const prepareWorkshop=(id:string)=>{
    if(conversationBusy||!canUseActions||!WORKSHOP_CASES[track.key].some(c=>c.id===id))return;
    setWorkshopId(id);setActiveTab('Professor');
  };
  const clearWorkshop=()=>{if(!conversationBusy)setWorkshopId(undefined);};`);
edit(app,'onActivityChange={setConversationBusy}/>','onActivityChange={setConversationBusy} workshopId={workshopId} onClearWorkshop={clearWorkshop}/>');
edit(app,'activeTab={activeTab} onTabChange={setActiveTab} />','activeTab={activeTab} onTabChange={setActiveTab} onPrepareWorkshop={prepareWorkshop} handoffDisabled={conversationBusy||!canUseActions} />');
const study='src/components/LessonStudyPanel.tsx';
edit(study,'onTabChange:(tab:string)=>void};','onTabChange:(tab:string)=>void;onPrepareWorkshop?:(id:string)=>void;handoffDisabled?:boolean};');
edit(study,'({track,lessonId,activeTab,onTabChange}:Props)','({track,lessonId,activeTab,onTabChange,onPrepareWorkshop,handoffDisabled}:Props)');
edit(study,'activeTab={activeTab} onTabChange={onTabChange}/>','activeTab={activeTab} onTabChange={onTabChange} onPrepareWorkshop={onPrepareWorkshop} handoffDisabled={handoffDisabled}/>');
edit(study,'function StudyContent({module,activeTab,onTabChange}:{module:NonNullable<ReturnType<typeof lessonModuleFor>>;activeTab:string;onTabChange:(tab:string)=>void})','function StudyContent({module,activeTab,onTabChange,onPrepareWorkshop,handoffDisabled}:{module:NonNullable<ReturnType<typeof lessonModuleFor>>;activeTab:string;onTabChange:(tab:string)=>void;onPrepareWorkshop?:(id:string)=>void;handoffDisabled?:boolean})');
edit(study,'<AppliedPracticePanel key={module.track} track={module.track}/>','<AppliedPracticePanel key={module.track} track={module.track} onPrepare={onPrepareWorkshop} handoffDisabled={handoffDisabled}/>');
const practice='src/components/AppliedPracticePanel.tsx';
edit(practice,'({track}:{track:WorkshopTrack})','({track,onPrepare,handoffDisabled=false}:{track:WorkshopTrack;onPrepare?:(id:string)=>void;handoffDisabled?:boolean})');
edit(practice,'Nothing is saved to your learning profile or sent to the Professor.','Your answers and local results are not saved to your learning profile or sent to the Professor.');
edit(practice,'  <WorkshopAttempt key={cases[index].id}',`  {onPrepare&&<div className="workshop-handoff" data-testid="workshop-handoff">
   <button type="button" disabled={handoffDisabled} onClick={()=>{if(!handoffDisabled)onPrepare(cases[index].id);}}>Prepare this scenario with Professor</button>
   <p>{handoffDisabled?'A current session or account restriction prevents changing the Professor scenario. Local practice remains available.':'This prepares only the scenario identifier for your next Start. No call starts, and your written answers, hints used and local results are not sent.'}</p>
  </div>}
  <WorkshopAttempt key={cases[index].id}`);
const workspace='src/components/LessonProfessorWorkspace.tsx';
edit(workspace,'onActivityChange:(busy:boolean)=>void};','onActivityChange:(busy:boolean)=>void;workshopId?:string;onClearWorkshop?:()=>void};');
edit(workspace,'activeTab,onTabChange,onActivityChange}:Props)','activeTab,onTabChange,onActivityChange,workshopId,onClearWorkshop}:Props)');
edit(workspace,'compact={!focused} onActivityChange={handleActivity}/>','compact={!focused} onActivityChange={handleActivity} workshopId={workshopId} onClearWorkshop={onClearWorkshop}/>');
const panel='src/components/ProfessorSessionPanel.tsx';
prepend(panel,"import {selectedWorkshop,type WorkshopSelection} from '../learning/workshopSelection';\nimport {WorkshopSessionReference} from './WorkshopSessionReference';");
edit(panel,'onActivityChange?:(busy:boolean)=>void};','onActivityChange?:(busy:boolean)=>void;workshopId?:string;onClearWorkshop?:()=>void};');
edit(panel,'compact=false,onActivityChange}:Props)','compact=false,onActivityChange,workshopId,onClearWorkshop}:Props)');
edit(panel," const [state,setState]=useState<SessionState>('ready');", " const [state,setState]=useState<SessionState>('ready');\n const pickedWorkshop=selectedWorkshop(track,workshopId?{version:1,id:workshopId}:null);\n const [sessionWorkshop,setSessionWorkshop]=useState<WorkshopSelection|null>(null);");
edit(panel,"  clearAudio();setState('connecting');", "  const workshopChoice:WorkshopSelection|undefined=pickedWorkshop?{version:1,id:pickedWorkshop.id}:undefined;\n  setSessionWorkshop(workshopChoice??null);\n  clearAudio();setState('connecting');");
edit(panel,'validationMode:requestedValidation,sessionPreparation,languageProfile:', 'validationMode:requestedValidation,sessionPreparation,workshopSelection:workshopChoice,languageProfile:');
edit(panel,'  {accountMatches&&!busy&&!compact&&<SessionPreparationPanel', '  <WorkshopSessionReference track={track} selection={busy?sessionWorkshop:pickedWorkshop?{version:1,id:pickedWorkshop.id}:null} busy={busy} onClear={onClearWorkshop}/>\n  {accountMatches&&!busy&&!compact&&<SessionPreparationPanel');
// No auto-start on handoff; changing the local workshop never mutates a running request.
console.log('Prepared ID-only workshop handoff, server-owned matching reference and acknowledgement checks. No providers invoked.');
