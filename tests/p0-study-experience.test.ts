import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const panel=fs.readFileSync('src/components/LessonStudyPanel.tsx','utf8');
const reader=fs.readFileSync('src/components/BrowserLessonReader.tsx','utf8');

test('Learn owns a collapsed accessibility reader and Audio never reuses it',()=>{
 assert.ok(panel.includes('<details className="lesson-accessibility-tool"'));
 assert.ok(panel.includes("disabled={readerDisabled||!readerOpen||activeTab!=='Learn'}"));
 assert.ok(panel.includes("hidden={activeTab!=='Audio'} data-testid=\"lesson-audio-boundary\""));
 assert.ok(panel.includes('Audio is not a reading of Learn'));
 assert.ok(!panel.includes("(activeTab==='Learn'||activeTab==='Audio')&&<BrowserLessonReader"));
 assert.ok(reader.includes('It is not the independent Audio lesson.'));
});

test('local completion requires explicit learning activity and answer-key evidence',()=>{
 assert.ok(panel.includes('lessonCompletionReady=!deepCompletionLocked&&learnConfirmed&&practiceEngaged&&grammarEngaged&&checkpointComplete&&correct.length>=checkpointTarget'));
 assert.ok(panel.includes("deepCompletionLocked=module.deepLesson?.completion.itemLevelEvidenceRequired===true"));
 assert.ok(panel.includes("Math.ceil(module.checkpoint.length*.6)"));
 assert.ok(panel.includes('Open responses are not automatically graded.'));
 assert.ok(panel.includes("localReviewStage?!checkpointComplete:!lessonCompletionReady"));
 assert.ok(!panel.includes("?'Check my response':'Check my revision'"));
});
