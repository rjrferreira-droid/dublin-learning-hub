import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const deepExperience=fs.readFileSync('src/components/DeepLessonExperience.tsx','utf8');
const studyPanel=fs.readFileSync('src/components/LessonStudyPanel.tsx','utf8');

test('LessonModule.deepLesson activates the deep tabs without changing legacy modules',()=>{
 assert.ok(studyPanel.includes('module.deepLesson?<DeepLessonExperience'));
 assert.ok(studyPanel.includes('const deepHandled=module.deepLesson?deepLessonHandlesTab'));
 assert.ok(studyPanel.includes("hidden={activeTab!=='Learn'||deepHandled}"));
 assert.ok(deepExperience.includes("const deepCoreTabs=new Set(['Learn','Audio','Practice'])"));
 assert.ok(deepExperience.includes("const deepEnglishTabs=new Set(['Grammar','Speaking'])"));
});

test('deep Learn exposes prerequisites, objectives, honest workload and authored depth',()=>{
 for(const required of [
  'PLANNED WORKLOAD',
  'AUTHORED ACTIVITY AVAILABLE',
  'Prerequisites',
  'Learning objectives',
  'Honest workload by phase',
  'Worked examples',
  'Common misconceptions',
 ])assert.ok(deepExperience.includes(required),`missing ${required}`);
 assert.ok(deepExperience.includes('computeSupportedWorkload(deep,{learnText})'));
 assert.ok(deepExperience.includes('Outline-only Audio is excluded until an independent episode exists.'));
});

test('deep Audio renders only its independent authored episode and a no-generation state',()=>{
 assert.ok(deepExperience.includes('AUDIO · DISTINCT AUTHORED EPISODE'));
 assert.ok(deepExperience.includes("'Authored episode · player availability shown below'"));
 assert.ok(deepExperience.includes("'Editorial outline · not generated or playable'"));
 assert.ok(deepExperience.includes('the written lesson is never substituted as Audio'));
 assert.ok(!deepExperience.includes("(activeTab==='Learn'||activeTab==='Audio')"));
});

test('deep Grammar and Practice render all authored items with two attempts and honest evaluation',()=>{
 assert.ok(deepExperience.includes('const DEEP_ITEM_ATTEMPTS=2'));
 assert.ok(deepExperience.includes('english.grammar.stages.map'));
 assert.ok(deepExperience.includes('NOTICE → UNDERSTAND → CHOOSE → BUILD → USE'));
 assert.ok(deepExperience.includes('deep.practice.sessionItemIds.map'));
 assert.ok(deepExperience.includes('practiceItems.filter'));
 assert.ok(deepExperience.includes("items.map(item=>renderItem(item,deep.practice.items.indexOf(item),'practice'))"));
 assert.ok(deepExperience.includes("(['current','previous','confirmed-error-bank'] as const)"));
 assert.ok(deepExperience.includes("item.evaluation.kind==='selection'"));
 assert.ok(deepExperience.includes('written answers are never auto-scored'));
 assert.ok(deepExperience.includes('This screen does not claim that a record was saved.'));
});

test('deep Speaking and ACCA exam tasks expose the required evidence boundaries',()=>{
 assert.ok(deepExperience.includes('CHUNKS, STRESS, LINKING, SHADOWING, TRANSFER'));
 assert.ok(deepExperience.includes('No acoustic percentage is calculated'));
 assert.ok(deepExperience.includes('english.speaking.tasks.map'));
 assert.ok(deepExperience.includes('task.totalMarks'));
 assert.ok(deepExperience.includes('task.timeLimitMinutes'));
 assert.ok(deepExperience.includes('Marking guide'));
});

test('a partial deep attempt never unlocks legacy lesson completion',()=>{
 assert.ok(studyPanel.includes("const deepCompletionLocked=module.deepLesson?.completion.itemLevelEvidenceRequired===true"));
 assert.ok(studyPanel.includes('const lessonCompletionReady=!deepCompletionLocked&&'));
 assert.ok(studyPanel.includes('One Grammar or Practice item, a tab visit, or this legacy checkpoint cannot unlock completion.'));
});
