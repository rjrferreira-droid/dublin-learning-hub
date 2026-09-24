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
 assert.match(catalogBlock,/learnerKey==='rafael'\?LOCAL_MODEL_LESSONS:LOCAL_PAYROLL_LESSONS/);
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

test('deep local lessons hide legacy Visual, Case and Test surfaces',()=>{
 assert.match(app,/deepLocal\?track==='english'/);
 assert.match(app,/\[\{label:'Learn',key:'Learn'\},\{label:'Audio',key:'Audio'\},\{label:'Practice',key:'Practice'\},\{label:'Sources',key:'Sources'\}\]/);
});
