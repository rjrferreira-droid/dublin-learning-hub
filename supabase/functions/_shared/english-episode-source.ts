import {createHash} from 'node:crypto';
import {deepAudioSource} from '../../../src/learning/deepInteractiveRegistry.ts';
import type {AudioCue} from '../../../src/learning/audioProduction.ts';
import {canonicalEnglishEpisodeIdentity,createEnglishEpisodeSourceContract,
 ENGLISH_EPISODE_RENDER_PROFILE,ENGLISH_EPISODE_RENDER_REVISION} from '../../../quality/candidates/english-episode-source-contract.ts';

export const ENGLISH_EPISODE_INSTRUCTIONS='Speak naturally in English, with clear phrasing and the character’s intent. Do not read role labels, stage directions or production instructions.';

/** Adjacent turns by one character become one TTS request when no authored
 * silence separates them. This preserves order and reduces the request count. */
export function groupEnglishEpisodeCues(cues:readonly AudioCue[]):readonly AudioCue[]{
 const result:AudioCue[]=[];
 for(const cue of cues){
  if(cue.kind==='silence'){result.push(cue);continue;}
  const previous=result.at(-1);
  if(previous?.kind==='speech'&&previous.speaker===cue.speaker&&previous.voice===cue.voice
    &&previous.text.length+1+cue.text.length<=4096){
   result[result.length-1]={...previous,text:`${previous.text} ${cue.text}`};
  }else result.push(cue);
 }
 return result;
}

/** Server-authored exact E1/P1 source. The transcript may contain editorial
 * speaker labels; only `renderCues[].text` is ever submitted to speech TTS. */
export function englishEpisodeSource(value:{lessonId:string;lessonSlug:string;sequence:number;contentVersion:number;
 moduleId:string;courseId:string;profileTrack:string;courseTrack:string}){
 if(value.profileTrack!=='rafael_finance'||value.courseTrack!=='english_academy')
  throw Error('english_episode_identity_invalid');
 const identity=canonicalEnglishEpisodeIdentity({lessonId:value.lessonId,moduleId:value.moduleId,courseId:value.courseId,
  lessonSlug:value.lessonSlug,contentVersion:value.contentVersion,
  requestedTrack:'english_academy',studyTrack:'english',sequence:value.sequence});
 const local=deepAudioSource(value.lessonId);
 if(!local||local.track!=='english_academy'||!local.cues?.length||!local.script.trim())throw Error('english_episode_source_missing');
 const cues=local.cues.map(cue=>{
  if(cue.kind==='silence'){
   if(!Number.isSafeInteger(cue.durationMs)||cue.durationMs<1||cue.durationMs>15000)throw Error('english_episode_cue_invalid');
   return {kind:'silence' as const,durationMs:cue.durationMs};
  }
  if(!['marin','coral','onyx','echo'].includes(cue.voice)||!cue.speaker.trim()||!cue.text.trim()
   ||Array.from(cue.text).length>4096||/\b(?:host|pause)\b/i.test(cue.text)
   ||/^\s*[A-Z][A-Z]+\s*:/.test(cue.text))throw Error('english_episode_cue_invalid');
  return {kind:'speech' as const,speaker:cue.speaker,voice:cue.voice,text:cue.text};
 });
 const recipe={renderProfile:ENGLISH_EPISODE_RENDER_PROFILE,renderRevision:ENGLISH_EPISODE_RENDER_REVISION,
  endpoint:'https://api.openai.com/v1/audio/speech',model:'gpt-4o-mini-tts',responseFormat:'mp3',speed:0.98,
  instructions:ENGLISH_EPISODE_INSTRUCTIONS,grouping:'adjacent-same-speaker-and-voice-max4096-v1',
  composer:'mpeg-layer-iii-skip-seek-frames-v1',silence:'24khz-mono-frame-rounded-v1'};
 const sourceFingerprint=createHash('sha256').update(JSON.stringify({identity,recipe,editorialTranscript:local.script,cues})).digest('hex');
 const contract=createEnglishEpisodeSourceContract({identity,sourceFingerprint});
 const jobBytes=createHash('sha256').update(`${identity.lessonId}:${sourceFingerprint}`).digest();
 jobBytes[6]=(jobBytes[6]&0x0f)|0x50;jobBytes[8]=(jobBytes[8]&0x3f)|0x80;
 const jobHex=jobBytes.subarray(0,16).toString('hex');
 const jobId=`${jobHex.slice(0,8)}-${jobHex.slice(8,12)}-${jobHex.slice(12,16)}-${jobHex.slice(16,20)}-${jobHex.slice(20)}`;
 const renderCues=groupEnglishEpisodeCues(cues);
 const cuePlan=renderCues.flatMap((cue,cueIndex)=>{
  if(cue.kind==='silence')return [];
  const cueFingerprint=createHash('sha256').update(JSON.stringify({episodeFingerprint:contract.sourceFingerprint,
   renderRevision:contract.renderRevision,cueIndex,speaker:cue.speaker,voice:cue.voice,text:cue.text,
   model:recipe.model,responseFormat:recipe.responseFormat,speed:recipe.speed,instructions:recipe.instructions})).digest('hex');
  const cuePath=`${contract.storagePath.slice(0,-4)}/cue-${cueIndex}-${cueFingerprint}.mp3`;
  return [{cueIndex,cueFingerprint,cuePath,characters:Array.from(cue.text).length}];
 });
 return {identity:contract.identity,sourceFingerprint:contract.sourceFingerprint,renderRevision:contract.renderRevision,storagePath:contract.storagePath,jobId,
  transcript:local.script,characters:Array.from(local.script).length,renderCues,cuePlan,recipe};
}
