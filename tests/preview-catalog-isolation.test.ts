import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync('src/App.tsx','utf8');
const catalogStart=app.indexOf('const supportedCatalog=useMemo');
const catalogEnd=app.indexOf('const activeTrack = useMemo',catalogStart);
const catalogBlock=app.slice(catalogStart,catalogEnd);

test('Preview uses the profile-specific canonical local curriculum without legacy published interleaving',()=>{
 assert.ok(catalogStart>=0&&catalogEnd>catalogStart,'supported catalog block not found');
 assert.match(catalogBlock,/if\(!curriculumPreview\)return published;/);
 assert.doesNotMatch(catalogBlock,/LOCAL_MODEL_LESSONS|LOCAL_PAYROLL_LESSONS/);
 assert.match(catalogBlock,/\.\.\.localEnglishLessonsForLearner\(learnerKey\)/);
 assert.match(catalogBlock,/return local;/);
 assert.doesNotMatch(catalogBlock,/return \[\.\.\.local,\.\.\.published/);
 assert.match(app,/if\(curriculumPreview\)\{setCatalog\(\[\]\);return;\}/);
});

test('local Preview cards distinguish deep-reviewed units from locked rebuilding units',()=>{
 assert.match(app,/function lessonWorkloadLabel\(lesson:CatalogLesson\)/);
 assert.match(app,/return isCurriculumUnitReady\(lesson\)\?'Deep-reviewed unit':'Rebuilding · not open yet'/);
 assert.match(app,/disabled=\{!unitReady\}/);
 assert.match(app,/unitReady\?\(completion\?'Review lesson':isResume\?'Resume lesson':'Open lesson'\):'Rebuilding'/);
 assert.match(app,/course\.total\?LOCAL_DEPTH_REVIEW_LABEL:`\$\{session\.minutes\} min`/);
 assert.doesNotMatch(app,/<span>\{lesson\.estimatedMinutes\} min<\/span>/);
 assert.doesNotMatch(app,/`\$\{dailyLesson\.estimatedMinutes\} min/);
 assert.doesNotMatch(app,/`\$\{nextLesson\.estimatedMinutes\} min/);
});

test('an unavailable local Audio tab does not claim that duplicated read-aloud is ready',()=>{
 assert.match(app,/The independent Audio episode is not yet available for this unit\./);
 assert.match(app,/!deepLocal && \(activeTab === 'Audio' \|\| activeTab === 'Professor'\)/);
 assert.match(app,/deepProfessorProviderLessonId/);
 assert.doesNotMatch(app,/Browser read-aloud is ready above\./);
});

test('English lessons use the shared five-stage path without a Sources tab',()=>{
 assert.match(app,/track==='english'\?\s*LANGUAGE_UNIT_FLOW\.map/);
 assert.match(app,/tab:'Practice',reviewStage:item.stage/);
});
