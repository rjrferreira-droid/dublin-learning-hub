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
 assert.ok(deepExperience.includes("const deepEnglishTabs=new Set(['Speaking'])"));
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
 assert.ok(deepExperience.includes("deep.audioEpisode.title"));
 assert.ok(deepExperience.includes('audioPlayer??'));
 assert.ok(deepExperience.includes('The audio for this lesson is being prepared.'));
 assert.ok(deepExperience.includes("deep.audioEpisode.format==='authored-script'"));
 assert.ok(deepExperience.includes('The full episode is not published yet.'));
 assert.ok(!deepExperience.includes("(activeTab==='Learn'||activeTab==='Audio')"));
});

// English interaction and assessment coverage lives in english-unit-flow,
// english-activity-runtime and english-activity-flow browser tests.

test('a partial deep attempt never unlocks legacy lesson completion',()=>{
 assert.ok(studyPanel.includes("const deepCompletionLocked=module.deepLesson?.completion.itemLevelEvidenceRequired===true"));
 assert.ok(studyPanel.includes('const lessonCompletionReady=!deepCompletionLocked&&'));
 assert.ok(studyPanel.includes('One Grammar or Practice item, a tab visit, or this legacy checkpoint cannot unlock completion.'));
});
