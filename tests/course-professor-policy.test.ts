import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('English keeps an in-unit Professor in the shared language path',()=>{
 const source=fs.readFileSync('src/App.tsx','utf8');
 const tabs=source.slice(source.indexOf('const lessonTabsFor='),source.indexOf('function LessonView'));
 assert.match(tabs,/track==='english'\?\s*LANGUAGE_UNIT_FLOW\.map/);
 assert.match(source,/LANGUAGE_UNIT_FLOW/);
 assert.match(source,/label="Ask the Professor"/);
 assert.match(source,/lessonProfessorEnabled=professorProviderLessonId!==null/);
 assert.match(source,/onPrepareWorkshop=\{track\.key==='english'\?prepareWorkshop:undefined\}/);
});

test('the active Professor view describes English communication',()=>{
 const source=fs.readFileSync('src/App.tsx','utf8');
 assert.match(source,/Finish the checkpoint for study progress\. Optional Professor debriefs create separate evaluated evidence\./);
 assert.match(source,/Use the Professor to discuss the English unit and receive feedback/);
});
