import {audioEpisodeText,type AudioEpisode} from './deepLessonContract.ts';
import {DEEP_ACCA_A1_CONTRACT} from './deepAccaA1.ts';
import {DEEP_ACCA_A2_CONTRACT} from './deepAccaA2.ts';
import {DEEP_ENGLISH_UNIT_1,DEEP_ENGLISH_UNIT_1_CONTRACT} from './deepEnglishUnit1.ts';
import {DEEP_RP1} from './deepEnglishSecondUnits.ts';
import {ACCA_A1_MODEL_ID,ACCA_A2_MODEL_ID} from './localModelLessonRegistry.ts';
import {ENGLISH_E1_MODEL_ID,ENGLISH_P1_MODEL_ID} from './localEnglishLessonRegistry.ts';
import {labelledDialogueCues,narratedCue,structuredAudioCues,type AudioCue} from './audioProduction.ts';

const PROFESSOR_PROVIDER_IDS:Readonly<Record<string,string>>=Object.freeze({
 [ENGLISH_E1_MODEL_ID]:'f455a740-f50f-4eb7-95a7-9e4129ca4a68',
 [ENGLISH_P1_MODEL_ID]:'1735c87f-29da-49ac-a9a9-718d7ff2f21a',
});

const source=(track:DeepAudioTrack,episode:AudioEpisode,cues?:readonly AudioCue[])=>({
 ...(()=>{if(episode.format!=='authored-script')throw new Error('deep_audio_script_required');return {
  track,script:audioEpisodeText(episode),chunks:episode.segments.map(segment=>segment.script),voice:'marin',cues,
 };})(),
});

const DEEP_AUDIO=Object.freeze({
 [ACCA_A1_MODEL_ID]:source('rafael_finance',DEEP_ACCA_A1_CONTRACT.audioEpisode),
 [ACCA_A2_MODEL_ID]:source('rafael_finance',DEEP_ACCA_A2_CONTRACT.audioEpisode),
 [ENGLISH_E1_MODEL_ID]:source('english_academy',DEEP_ENGLISH_UNIT_1_CONTRACT.audioEpisode,
  structuredAudioCues(DEEP_ENGLISH_UNIT_1.audio.segments)),
 [ENGLISH_P1_MODEL_ID]:source('english_academy',DEEP_RP1.contract.audioEpisode,
  DEEP_RP1.contract.audioEpisode.format==='authored-script'
   ?DEEP_RP1.contract.audioEpisode.segments.flatMap(segment=>segment.kind==='dialogue'
     ?labelledDialogueCues(segment.script,['NIAMH','RAFAEL','THEO'])
     :segment.script.startsWith('Pause and ')?[{kind:'silence' as const,durationMs:3000},narratedCue(segment.script.replace(/^Pause and /,'').replace(/^retrieve /,'Retrieve '))]
     :[narratedCue(segment.script)])
   :undefined),
} as const);

export type DeepAudioTrack='rafael_finance'|'english_academy';

/** Exact local lesson IDs admitted to the isolated Preview audio pipeline. */
export function deepAudioSource(lessonId:string):{track:DeepAudioTrack;script:string;chunks:readonly string[];voice:string;cues?:readonly AudioCue[]}|null{
 return Object.hasOwn(DEEP_AUDIO,lessonId)?DEEP_AUDIO[lessonId as keyof typeof DEEP_AUDIO]:null;
}

/** Keep local curriculum identity separate from the reviewed server lesson used by Professor. */
export function deepProfessorProviderLessonId(lessonId:string):string|null{
 return PROFESSOR_PROVIDER_IDS[lessonId]??null;
}

export function deepInteractiveAudioLesson(lessonId:string){return deepAudioSource(lessonId)!==null;}
