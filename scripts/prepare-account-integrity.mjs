// The one-time patches were materialized only after successful browser verification.
// This retained entrypoint now verifies source boundaries; it never edits or commits code.
import fs from 'node:fs';
const checks=[
 ['src/components/AuthGate.tsx','LearnerSessionContext.Provider','account context'],
 ['src/components/AuthGate.tsx','profileUserId !== session.user.id','profile ownership'],
 ['src/components/AuthGate.tsx','profile-load-failure','recoverable profile error'],
 ['src/App.tsx','loadLearningMemory(account.userId)','account-bound history'],
 ['src/App.tsx','const privateDataVisible = learnerKey === accountLearnerKey','resolved private identity'],
 ['src/components/ProfessorSessionPanel.tsx','connectionAbortRef.current?.abort()','connection cleanup'],
 ['src/components/ProfessorSessionPanel.tsx','Cancel connection','cancellation UI'],
 ['api/livekit-token.ts','requestedLearnerMatchesAccount(learnerProfile.learner_track,body.learnerId)','API identity comparison'],
 ['tests/smoke.spec.ts','resolveAuthFixture(process.env)','explicit authenticated fixture'],
];
for(const [file,needle,label] of checks){if(!fs.readFileSync(file,'utf8').includes(needle))throw new Error(`Account boundary regression: ${label}`);}
const memory=fs.readFileSync('src/services/learningMemory.ts','utf8');
if(memory.split(".eq('user_id', userId)").length!==5)throw new Error('Four learning reads must retain explicit user scoping.');
if(fs.readFileSync('src/components/AuthGate.tsx','utf8').includes('document.querySelectorAll<HTMLButtonElement>'))throw new Error('Legacy DOM-click identity synchronization must not return.');
console.log('Account-bound source assertions passed. No files or external services were changed.');
