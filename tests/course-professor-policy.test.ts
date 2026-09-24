import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('English keeps an in-unit Professor while ACCA and Payroll use optional course-level support',()=>{
 const source=fs.readFileSync('src/App.tsx','utf8');
 const tabs=source.slice(source.indexOf('const lessonTabsFor='),source.indexOf('function LessonView'));
 assert.match(tabs,/track==='english'.*Professor/s);
 assert.equal((tabs.match(/Professor/g)??[]).length,4,'both deep-local and legacy English tab sets keep the in-unit Professor entry');
 assert.match(source,/label="Ask the Professor"/);
 assert.match(source,/lessonProfessorEnabled=track\.key==='english'/);
 assert.match(source,/onPrepareWorkshop=\{track\.key==='english'\?prepareWorkshop:undefined\}/);
});

test('technical lessons explain progress without making a Professor session mandatory',()=>{
 const source=fs.readFileSync('src/App.tsx','utf8');
 assert.match(source,/Finish the checkpoint for study progress\. Optional Professor debriefs create separate evaluated evidence\./);
 assert.match(source,/In ACCA and Payroll this is optional support, not a required lesson step\./);
});
