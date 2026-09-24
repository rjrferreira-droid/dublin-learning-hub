import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {LESSON_MODULES,lessonModuleFor} from '../src/learning/lessonModules.ts';
import {checkLocalChoice} from '../src/learning/checkLocalChoice.ts';
import {STUDY_PACKS} from '../src/learning/teachingPacks.ts';
const modules=Object.values(LESSON_MODULES);
test('three written foundations share the same known lessons as their companions',()=>{assert.equal(modules.length,3);for(const m of modules){assert.equal(m.lessonId,STUDY_PACKS[m.track].lessonId);assert.equal(lessonModuleFor(m.track,m.lessonId),m);assert.equal(lessonModuleFor(m.track,'unrelated'),null);}});
test('twelve teaching sections, eighteen usable terms, fifteen original checkpoint items',()=>{assert.equal(modules.reduce((n,m)=>n+m.sections.length,0),12);assert.equal(modules.reduce((n,m)=>n+m.terms.length,0),18);assert.equal(modules.reduce((n,m)=>n+m.checkpoint.length,0),15);});
for(const m of modules){
 test(`${m.track}: linked concepts, source dates and remediation targets are structurally complete`,()=>{
  const sections=new Set(m.sections.map(s=>s.id));const sources=new Set(m.sources.map(s=>s.id));
  assert.equal(sections.size,m.sections.length);assert.ok(m.goal.length>50);assert.ok(m.scope.length>80);
  for(const s of m.sections){assert.ok(s.paragraphs.join(' ').split(/\s+/).length>90);assert.ok(s.supportPt.length>50);for(const id of s.sourceIds)assert.ok(sources.has(id));}
  for(const src of m.sources){assert.equal(src.reviewedOn,'2026-09-13');assert.equal(new URL(src.url).protocol,'https:');assert.ok(src.supports.length>20);}
  for(const term of m.terms)for(const value of Object.values(term))assert.ok(value.trim().length>0);
  for(const q of m.checkpoint){assert.equal(q.options.length,4);assert.ok(Number.isInteger(q.correctIndex)&&q.correctIndex>=0&&q.correctIndex<4);assert.equal(new Set(q.options).size,4);assert.ok(sections.has(q.reviewSection));assert.ok(q.explanation.length>60);}
  assert.equal(m.caseStudy.reviewChecks.length,4);assert.ok(m.caseStudy.modelAnswer.length>250);assert.ok(m.visual.rows.length>=4);
 });
 test(`${m.track}: answer key handles every valid option and rejects absent or invalid input`,()=>{
  for(const q of m.checkpoint){for(let n=0;n<q.options.length;n++)assert.equal(checkLocalChoice(q,n),n===q.correctIndex?'correct':'incorrect');for(const v of [undefined,null,'1',NaN,Infinity,-1,4,1.5])assert.equal(checkLocalChoice(q,v),'unanswered');}
 });
}
test('all section and checkpoint IDs are unique across courses',()=>{const ids=modules.flatMap(m=>[...m.sections.map(s=>s.id),...m.checkpoint.map(q=>q.id)]);assert.equal(new Set(ids).size,ids.length);});
test('original finance case arithmetic is consistent with written response',()=>{const op=1500-1120;const before=op+20;const final=before-50-70;assert.equal(op,380);assert.equal(before,400);assert.equal(final,280);assert.equal(op+20,400);for(const amount of ['380','400','280'])assert.ok(LESSON_MODULES.finance.caseStudy.modelAnswer.includes(amount));});
test('original payroll case does not deduct employer PRSI from employee cash',()=>{assert.equal(3200-400-64-128-96,2512);assert.equal(3200-470-64-128-96,2442);assert.equal(3200+352,3552);for(const amount of ['2,512','2,442','3,552'])assert.ok(LESSON_MODULES.payroll.caseStudy.modelAnswer.includes(amount));});
test('written self-study does not import network clients or persistence mechanisms',()=>{const s=fs.readFileSync('src/components/LessonStudyPanel.tsx','utf8')+fs.readFileSync('src/learning/lessonModules.ts','utf8');for(const unsafe of ['fetch(','supabase.','localStorage','sessionStorage','indexedDB','sendBeacon','connectProfessor('])assert.ok(!s.includes(unsafe),unsafe);});
test('lesson module stays mounted across tabs and Audio player is placed in its lesson column',()=>{const s=fs.readFileSync('src/App.tsx','utf8');assert.ok(s.includes('<LessonStudyPanel key={track.lessonId}'));for(const name of ['function LearnPanel(','function VisualPanel(','function TestPanel(','function SourcesPanel('])assert.ok(!s.includes(name));assert.ok(s.includes('audioPlayer={lessonAudioEnabled'));assert.ok(s.includes('<PremiumAudioPanel lessonId={track.lessonId}'));assert.ok(s.includes('hidden={activeTab===\'Audio\'}'));assert.ok(s.includes("<LessonProfessorWorkspace track={track.key}"));assert.ok(!s.includes("{activeTab === 'Professor' && <InlineProfessorPanel"));});
test('local practice explicitly excludes mastery and real oral assessment',()=>{const s=fs.readFileSync('src/components/LessonStudyPanel.tsx','utf8');assert.ok(s.includes('not saved to your profile'));assert.ok(s.includes('not an AI evaluation, mastery score or course completion'));assert.ok(LESSON_MODULES.english.scope.includes('No pronunciation'));assert.ok(LESSON_MODULES.payroll.scope.includes('fictional'));});
