import type {BoundIdentity} from './professor-admission-contract.ts';
import {goldenAudioTrack} from '../../src/learning/goldenAudioRegistry.ts';

export const PREMIUM_AUDIO_RENDER_PROFILE='written-study-guide-v1' as const;
export const PREMIUM_AUDIO_RENDER_REVISION=1 as const;

const instructions=Object.freeze({
 en:'Speak in clear natural English as a patient teacher. This is a study-guide overview; do not claim that pronunciation or an Irish accent was assessed.',
 'pt-BR':'Speak in natural Brazilian Portuguese as a calm expert teacher. Keep technical English terms in English.',
} as const);

/** Any provider-affecting change requires a new profile or revision before it
 * can be used. The revision is part of the object path; this complete recipe
 * is part of the source fingerprint. */
export const PREMIUM_AUDIO_RENDER_RECIPE=Object.freeze({
 profile:PREMIUM_AUDIO_RENDER_PROFILE,
 revision:PREMIUM_AUDIO_RENDER_REVISION,
 provider:'openai',
 endpoint:'https://api.openai.com/v1/audio/speech',
 request:Object.freeze({model:'gpt-4o-mini-tts',voice:'marin',response_format:'mp3',speed:0.98,instructions}),
} as const);

export type PremiumAudioRenderLanguage=keyof typeof instructions;
const resolvedRecipes=Object.freeze({
 en:Object.freeze({profile:PREMIUM_AUDIO_RENDER_RECIPE.profile,revision:PREMIUM_AUDIO_RENDER_RECIPE.revision,
  provider:PREMIUM_AUDIO_RENDER_RECIPE.provider,endpoint:PREMIUM_AUDIO_RENDER_RECIPE.endpoint,
  request:Object.freeze({model:PREMIUM_AUDIO_RENDER_RECIPE.request.model,voice:PREMIUM_AUDIO_RENDER_RECIPE.request.voice,
   response_format:PREMIUM_AUDIO_RENDER_RECIPE.request.response_format,speed:PREMIUM_AUDIO_RENDER_RECIPE.request.speed,
   instructions:PREMIUM_AUDIO_RENDER_RECIPE.request.instructions.en})}),
 'pt-BR':Object.freeze({profile:PREMIUM_AUDIO_RENDER_RECIPE.profile,revision:PREMIUM_AUDIO_RENDER_RECIPE.revision,
  provider:PREMIUM_AUDIO_RENDER_RECIPE.provider,endpoint:PREMIUM_AUDIO_RENDER_RECIPE.endpoint,
  request:Object.freeze({model:PREMIUM_AUDIO_RENDER_RECIPE.request.model,voice:PREMIUM_AUDIO_RENDER_RECIPE.request.voice,
   response_format:PREMIUM_AUDIO_RENDER_RECIPE.request.response_format,speed:PREMIUM_AUDIO_RENDER_RECIPE.request.speed,
   instructions:PREMIUM_AUDIO_RENDER_RECIPE.request.instructions['pt-BR']})}),
} as const);

/** Return only one reviewed language recipe. Browser values and silent locale
 * fallbacks cannot select provider instructions. */
export function resolvePremiumAudioRenderRecipe(language:unknown){
 if(language!=='en'&&language!=='pt-BR')throw Error('premium_audio_render_language_invalid');
 return resolvedRecipes[language];
}

const identityKeys=['lessonId','moduleId','courseId','lessonSlug','contentVersion','requestedTrack','studyTrack','sequence'] as const;
const requestTracks={rafael_finance:'finance',viviane_payroll:'payroll',english_academy:'english'} as const;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const sha256=/^[a-f0-9]{64}$/;
const exactKeys=(value:unknown,keys:readonly string[])=>value!==null&&typeof value==='object'&&!Array.isArray(value)
 &&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));

/** Canonical identity used by the authored source fingerprint and immutable
 * object path. It accepts only the complete server-resolved lesson identity. */
export function canonicalPremiumAudioIdentity(value:unknown):Readonly<BoundIdentity>{
 if(!exactKeys(value,identityKeys))throw Error('premium_audio_source_identity_invalid');
 const identity=value as Record<(typeof identityKeys)[number],unknown>;
 if(![identity.lessonId,identity.moduleId,identity.courseId].every(part=>typeof part==='string'&&uuid.test(part))
  ||typeof identity.lessonSlug!=='string'||!identity.lessonSlug.trim()
  ||!Number.isSafeInteger(identity.contentVersion)||Number(identity.contentVersion)<1||Number(identity.contentVersion)>100000
  ||!Number.isSafeInteger(identity.sequence)||Number(identity.sequence)<1||Number(identity.sequence)>8
  ||(identity.sequence===1&&goldenAudioTrack(identity)===null)
  ||typeof identity.requestedTrack!=='string'||!Object.hasOwn(requestTracks,identity.requestedTrack)
  ||typeof identity.studyTrack!=='string'||requestTracks[identity.requestedTrack as keyof typeof requestTracks]!==identity.studyTrack)
  throw Error('premium_audio_source_identity_invalid');
 return Object.freeze({lessonId:identity.lessonId as string,moduleId:identity.moduleId as string,courseId:identity.courseId as string,
  lessonSlug:identity.lessonSlug,contentVersion:identity.contentVersion as number,requestedTrack:identity.requestedTrack,
  studyTrack:identity.studyTrack,sequence:identity.sequence as number});
}

export function immutablePremiumAudioStoragePath(identity:unknown,sourceFingerprint:unknown):string{
 const canonical=canonicalPremiumAudioIdentity(identity);
 if(typeof sourceFingerprint!=='string'||!sha256.test(sourceFingerprint))throw Error('premium_audio_source_fingerprint_invalid');
 return `lessons/${canonical.lessonId}/commentary-v${canonical.contentVersion}-${sourceFingerprint}-r${PREMIUM_AUDIO_RENDER_REVISION}.mp3`;
}

export type PremiumAudioSourceContract=Readonly<{
 identity:Readonly<BoundIdentity>;
 renderProfile:typeof PREMIUM_AUDIO_RENDER_PROFILE;
 renderRevision:typeof PREMIUM_AUDIO_RENDER_REVISION;
 sourceFingerprint:string;
 storagePath:string;
}>;

/** Bind one exact rendered narration source to one immutable storage object. */
export function createPremiumAudioSourceContract(value:unknown):PremiumAudioSourceContract{
 if(!exactKeys(value,['identity','sourceFingerprint']))throw Error('premium_audio_source_contract_invalid');
 const input=value as {identity:unknown;sourceFingerprint:unknown};
 const identity=canonicalPremiumAudioIdentity(input.identity);
 if(typeof input.sourceFingerprint!=='string'||!sha256.test(input.sourceFingerprint))throw Error('premium_audio_source_fingerprint_invalid');
 return Object.freeze({identity,renderProfile:PREMIUM_AUDIO_RENDER_PROFILE,renderRevision:PREMIUM_AUDIO_RENDER_REVISION,
  sourceFingerprint:input.sourceFingerprint,storagePath:immutablePremiumAudioStoragePath(identity,input.sourceFingerprint)});
}
