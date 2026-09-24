// One-time App routing materialization. Tested locally in CI before its source is committed.
// It does not change account checks, the voice panel, API, worker, backend or child portal.
import fs from 'node:fs';
const branch=process.env.GITHUB_REF_NAME;
if(branch&&branch!=='feat/professor-experience-2026-09-13')throw new Error('wrong_branch');
const path='src/App.tsx';let source=fs.readFileSync(path,'utf8');
if(!source.includes("from './components/LessonStudyPanel'")){
 const original=source;
 source="import { LessonStudyPanel } from './components/LessonStudyPanel';\n"+source;
 const panels=['LearnPanel','EnglishPanel','PracticePanel','VisualPanel','CasePanel','TestPanel','SourcesPanel'];
 for(const panel of panels){
  const expression=new RegExp(`^\\s*\\{activeTab === '[^']+' && <${panel}(?: track=\\{track\\})? \\/>\\}\\r?\\n`,'m');
  if(!expression.test(source))throw new Error('panel_route_not_found:'+panel);
  source=source.replace(expression,'');
 }
 const anchor='          {activeTab === \'Audio\' &&';
 if(source.split(anchor).length!==2)throw new Error('audio_anchor_not_unique');
 source=source.replace(anchor,'          <LessonStudyPanel key={track.lessonId} track={track.key} lessonId={track.lessonId} activeTab={activeTab} onTabChange={setActiveTab} />\n'+anchor);
 const first=source.indexOf('function LearnPanel('),last=source.indexOf('function InlineProfessorPanel(',first);
 if(first<0||last<first)throw new Error('old_panel_block_missing');
 source=source.slice(0,first)+source.slice(last);
 // Prevent accidental loss of the existing protected personalized actions.
 for(const exact of ["{activeTab === 'Audio' && (canUseActions ? <PremiumAudioPanel", "{activeTab === 'Professor' && <InlineProfessorPanel",'const privateDataVisible = learnerKey === accountLearnerKey']){
  if(!original.includes(exact)||!source.includes(exact))throw new Error('protected_ui_boundary_changed');
 }
 fs.writeFileSync(path,source);
}
console.log('Written tabs use one lesson-specific module; voice and personalized-action guards unchanged.');
