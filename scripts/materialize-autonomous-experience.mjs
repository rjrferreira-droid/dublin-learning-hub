// Narrow, fail-on-drift candidate patch; never run on the frozen voice baseline or normal V2.
import fs from 'node:fs';
if(process.env.GITHUB_REF_NAME!=='feat/professor-experience-2026-09-13')throw new Error('wrong_branch');
function edit(file,before,after){const text=fs.readFileSync(file,'utf8');if(text.includes(after))return;if(text.split(before).length!==2)throw new Error(`experience_anchor_not_unique:${file}:${before.slice(0,65)}`);fs.writeFileSync(file,text.replace(before,after));}
edit('src/learning/sessionPreparation.ts',"|| !GOAL_OPTIONS.some(o=>o.value===v.goal) || !['patient','balanced'].includes(String(v.pace))\n      || !['profile','pt-BR','en'].includes(String(v.support))", "|| !GOAL_OPTIONS.some(o=>o.value===v.goal) || typeof v.pace!=='string' || !['patient','balanced'].includes(v.pace)\n      || typeof v.support!=='string' || !['profile','pt-BR','en'].includes(v.support)");
edit('src/services/contracts.ts',"export type LearnerTrack =", "import type {SessionPreparation} from '../learning/sessionPreparation.js';\nexport type LearnerTrack =");
edit('src/services/contracts.ts','  validationMode?: boolean;','  validationMode?: boolean;\n  sessionPreparation?: SessionPreparation;');
const api='api/livekit-token.ts';
edit(api,"import { voiceValidationPlan } from '../server/voice-validation.js';", "import { voiceValidationPlan } from '../server/voice-validation.js';\nimport {parseSessionPreparation,teachingApproachBrief} from '../src/learning/sessionPreparation.js';");
edit(api,"  if (!body || !lessonId || !track || !mode) return send(res, 400, { error: 'invalid_professor_request' });",`  if (!body || !lessonId || !track || !mode) return send(res, 400, { error: 'invalid_professor_request' });
  let sessionPreparation: ReturnType<typeof parseSessionPreparation>;
  try { sessionPreparation=parseSessionPreparation(body.sessionPreparation); }
  catch { return send(res,400,{error:'invalid_session_preparation'}); }`);
edit(api,'      requestedLessonId: lessonId, resolvedLessonId: persistenceLessonId,','      requestedLessonId: lessonId, resolvedLessonId: persistenceLessonId,\n      approachBrief: teachingApproachBrief(sessionPreparation,profileForTrack(track)),');
edit(api,'    if (writtenLesson) lessonContext = writtenLesson.context;',`    if (body.sessionPreparation!==undefined && !writtenLesson) return send(res,409,{error:'session_preparation_unavailable'});
    if (writtenLesson) lessonContext = writtenLesson.context;`);
edit(api,'  const languageProfile = normalizeLanguageProfile(body.languageProfile);',`  const languageProfile = normalizeLanguageProfile(body.languageProfile);
  if(sessionPreparation.support==='pt-BR') languageProfile.supportLanguage='pt-BR';
  if(sessionPreparation.support==='en') { languageProfile.supportLanguage='en'; languageProfile.professorEnglishSharePct=100; }`);
edit(api,'    teachingContent: writtenLesson?.descriptor ?? null,\n    budgetReservationId:', '    teachingContent: writtenLesson?.descriptor ?? null,\n    sessionPreparation,\n    budgetReservationId:');
edit(api,'      teachingContent: writtenLesson?.descriptor ?? null,\n    });','      teachingContent: writtenLesson?.descriptor ?? null,\n      sessionPreparation: writtenLesson ? sessionPreparation : null,\n    });');
const bridge='server/written-lesson-context.ts';
edit(bridge,'  requestedLessonId: string; resolvedLessonId: string;','  requestedLessonId: string; resolvedLessonId: string;\n  /** Generated from enum-only choices by the server; never supplied verbatim by a browser. */\n  approachBrief?: string;');
edit(bridge,"const technicalBrief = [scope, sections, caseReference, `OFFICIAL SOURCE REFERENCES\\n${references}`].join('\\n\\n');", "const technicalBrief = [scope, input.approachBrief ?? '', sections, caseReference, `OFFICIAL SOURCE REFERENCES\\n${references}`].filter(Boolean).join('\\n\\n');");
const client='src/professor/livekitProfessor.ts';
edit(client,"import { observedProfessorState, type ProfessorVoiceState } from './voiceState';", "import { observedProfessorState, type ProfessorVoiceState } from './voiceState';\nimport {sameSessionPreparation} from '../learning/sessionPreparation';");
edit(client,"professorProfile:ProfessorTokenResponse['professorProfile'];validationMode:boolean;disconnect:()=>Promise<void>;", "professorProfile:ProfessorTokenResponse['professorProfile'];validationMode:boolean;disconnect:()=>Promise<void>;setMicrophoneEnabled:(enabled:boolean)=>Promise<void>;");
edit(client,'validationMode:request.validationMode===true})','validationMode:request.validationMode===true,sessionPreparation:request.sessionPreparation})');
edit(client,' return body as ProfessorTokenResponse;',` if(request.sessionPreparation && (!body.sessionPreparation || !sameSessionPreparation(request.sessionPreparation,body.sessionPreparation)))throw new Error('Session preferences could not be confirmed. No microphone was opened.');
 return body as ProfessorTokenResponse;`);
edit(client,'  return {room,roomName:credentials.roomName,participantIdentity:credentials.participantIdentity,sessionId:credentials.sessionId,maxSessionSeconds:credentials.maxSessionSeconds,professorProfile:credentials.professorProfile,validationMode:credentials.validationMode,disconnect};',`  async function setMicrophoneEnabled(enabled:boolean){
   if(!active())throw new Error('Professor connection is no longer active.');
   await room.localParticipant.setMicrophoneEnabled(enabled);
   if(!active()){await room.localParticipant.setMicrophoneEnabled(false).catch(()=>undefined);throw new Error('Professor connection changed.');}
  }
  return {room,roomName:credentials.roomName,participantIdentity:credentials.participantIdentity,sessionId:credentials.sessionId,maxSessionSeconds:credentials.maxSessionSeconds,professorProfile:credentials.professorProfile,validationMode:credentials.validationMode,disconnect,setMicrophoneEnabled};`);
const panel='src/components/ProfessorSessionPanel.tsx';
edit(panel,"import { ProfessorLearningGuide } from './ProfessorLearningGuide';", "import { ProfessorLearningGuide } from './ProfessorLearningGuide';\nimport {SessionPreparationPanel} from './SessionPreparationPanel';\nimport {SessionOutcomePanel} from './SessionOutcomePanel';\nimport {DEFAULT_PREPARATION,type SessionPreparation} from '../learning/sessionPreparation';");
edit(panel," const [state,setState]=useState<SessionState>('ready');", " const [state,setState]=useState<SessionState>('ready');\n const [sessionPreparation,setSessionPreparation]=useState<SessionPreparation>({...DEFAULT_PREPARATION});\n const [microphoneEnabled,setMicrophoneEnabled]=useState(true);\n const [microphoneBusy,setMicrophoneBusy]=useState(false);");
edit(panel,'mode:contract.mode,validationMode:requestedValidation,languageProfile:', 'mode:contract.mode,validationMode:requestedValidation,sessionPreparation,languageProfile:');
edit(panel,"setAudioBlocked(!connection.room.canPlaybackAudio);setState('connected');", "setAudioBlocked(!connection.room.canPlaybackAudio);setMicrophoneEnabled(true);setMicrophoneBusy(false);setState('connected');");
edit(panel,' async function enableAudio(){',` async function toggleMicrophone(){
  const connection=connectionRef.current;const controller=connectionAbortRef.current;
  if(!connection||!controller||controller.signal.aborted||microphoneBusy)return;
  setMicrophoneBusy(true);
  try{
   await connection.setMicrophoneEnabled(!microphoneEnabled);
   if(!controller.signal.aborted&&connectionRef.current===connection)setMicrophoneEnabled(v=>!v);
  }catch{if(!controller.signal.aborted)setError('The microphone setting could not be changed.');}
  finally{if(!controller.signal.aborted)setMicrophoneBusy(false);}
 }
 async function enableAudio(){`);
edit(panel,'  {requestedValidation&&!active', '  {accountMatches&&!active&&state!==\'connecting\'&&<SessionPreparationPanel value={sessionPreparation} onChange={setSessionPreparation}/>}\n  {requestedValidation&&!active');
edit(panel,'    <button className="primary-btn professor-stop"', '    <button className="secondary-btn professor-mute" type="button" disabled={microphoneBusy} aria-pressed={!microphoneEnabled} onClick={()=>void toggleMicrophone()}>{microphoneEnabled?\'Mute microphone\':\'Unmute microphone\'}</button>\n    <button className="primary-btn professor-stop"');
edit(panel,'  {audioBlocked&&active&&', '  {active&&!microphoneEnabled&&<p className="professor-mic-state" role="status">Microphone muted. The session timer and usage charges continue; use End session to leave.</p>}\n  {audioBlocked&&active&&');
edit(panel,'  <div ref={audioHostRef}', '  {state===\'ended\'&&details&&<SessionOutcomePanel key={details.sessionId} sessionId={details.sessionId} validation={details.validationMode}/>}\n  <div ref={audioHostRef}');
edit('src/App.tsx',"import { ProfessorSessionPanel } from './components/ProfessorSessionPanel';", "import { ProfessorSessionPanel } from './components/DeferredProfessorPanel';");
edit('src/main.tsx',"import React from 'react';", "import React,{lazy,Suspense} from 'react';");
edit('src/main.tsx',"import App from './App';", "const App=lazy(()=>import('./App'));");
edit('src/main.tsx','          <App />','          <Suspense fallback={<p role="status" className="workspace-loading">Preparing your learning workspace…</p>}><App /></Suspense>');
edit('vite.config.ts','  plugins: [react()],','  plugins: [react()],\n  build: { manifest: true },');
console.log('Prepared enum-only teaching preferences, bounded read-only session feedback, microphone control and deferred voice/workspace bundles. No services invoked.');
