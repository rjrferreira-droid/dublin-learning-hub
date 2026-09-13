import fs from 'node:fs';
const path='api/livekit-token.ts';let source=fs.readFileSync(path,'utf8');
if(!source.includes("from '../server/professor-start.js'")) {
 source="import { startProfessorAtomically, ProfessorStartupError } from '../server/professor-start.js';\n"+source;
 const start=source.indexOf('async function reserveProfessorBudget('),end=source.indexOf('export default async function handler');
 if(start<0||end<start)throw new Error('Startup helper anchors drifted');
 source=source.slice(0,start)+source.slice(end);
 const from=source.indexOf('  const requestedQualityTier = qualityTierForMode(mode);');
 const to=source.indexOf('  const jobMetadata = JSON.stringify({',from);
 if(from<0||to<from)throw new Error('Startup callsite anchors drifted');
 source=source.slice(0,from)+`  const professorProfile = profileForTrack(track);
  const languageProfile = normalizeLanguageProfile(body.languageProfile);
  const requestedRoomName = \`\${validationMode ? 'validation:' : ''}lh-\${randomUUID()}\`;
  const participantIdentity = \`learner-\${randomUUID()}\`;
  let startup: Awaited<ReturnType<typeof startProfessorAtomically>>;
  try {
    startup = await startProfessorAtomically(db, { lessonId:persistenceLessonId,mode,roomName:requestedRoomName,validationMode });
  } catch (cause) {
    const failure = cause instanceof ProfessorStartupError ? cause : new ProfessorStartupError('professor_session_persistence_unavailable',503);
    return send(res,failure.status,{error:failure.message});
  }
  const { budget,persistence,roomName } = startup;

`+source.slice(to);
 const old=`    await db
      .from('ai_tutor_sessions')
      .update({
        status: 'abandoned',
        completed_at: new Date().toISOString(),
        close_reason: validationMode ? 'validation:livekit_dispatch_failed' : 'livekit_dispatch_failed',
      })
      .eq('id', persistence.sessionId);`;
 if(!source.includes(old))throw new Error('Dispatch failure anchor drifted');
 source=source.replace(old,`    // An HTTP failure is not proof that no agent was dispatched: preserve its reserve.
    await db.rpc('flag_professor_dispatch_uncertain', {
      p_session_id: persistence.sessionId, p_callback_token: persistence.callbackToken,
    });`);
 fs.writeFileSync(path,source);
}
console.log('Atomic startup wired only in the isolated repair branch.');
