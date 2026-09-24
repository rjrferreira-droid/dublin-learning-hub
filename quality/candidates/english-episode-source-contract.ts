import type {BoundIdentity} from './professor-admission-contract.ts';

/** A new render profile is required when the voice plan, instructions, codec or
 * composition algorithm changes. Legacy commentary audio remains independent. */
export const ENGLISH_EPISODE_RENDER_PROFILE='english-dialogue-episode-v1' as const;
export const ENGLISH_EPISODE_RENDER_REVISION=1 as const;

const expectedLessons=Object.freeze({
 'e1100000-2026-4e11-8e01-000000000001':Object.freeze({
  slug:'preview-deep-story-past-forms-rhythm-follow-up',sequence:101,
 }),
 'e2100000-2026-4e21-8e03-000000000003':Object.freeze({
  slug:'preview-deep-clarify-check-understanding-handle-meetings',sequence:102,
 }),
} as const);
const identityKeys=['lessonId','moduleId','courseId','lessonSlug','contentVersion','requestedTrack','studyTrack','sequence'] as const;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const sha256=/^[0-9a-f]{64}$/;
const exactKeys=(value:unknown,keys:readonly string[])=>value!==null&&typeof value==='object'&&!Array.isArray(value)
 &&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));

export function canonicalEnglishEpisodeIdentity(value:unknown):Readonly<BoundIdentity>{
 if(!exactKeys(value,identityKeys))throw Error('english_episode_identity_invalid');
 const identity=value as Record<(typeof identityKeys)[number],unknown>;
 const expected=expectedLessons[identity.lessonId as keyof typeof expectedLessons];
 if(typeof identity.lessonId!=='string'||!expected
  ||typeof identity.moduleId!=='string'||!uuid.test(identity.moduleId)
  ||typeof identity.courseId!=='string'||!uuid.test(identity.courseId)
  ||identity.lessonSlug!==expected.slug||identity.sequence!==expected.sequence
  ||identity.contentVersion!==2||identity.requestedTrack!=='english_academy'||identity.studyTrack!=='english')
  throw Error('english_episode_identity_invalid');
 return Object.freeze({lessonId:identity.lessonId,moduleId:identity.moduleId,courseId:identity.courseId,
  lessonSlug:identity.lessonSlug,contentVersion:2,requestedTrack:'english_academy',studyTrack:'english',sequence:expected.sequence});
}

export function immutableEnglishEpisodeStoragePath(identity:unknown,sourceFingerprint:unknown):string{
 const canonical=canonicalEnglishEpisodeIdentity(identity);
 if(typeof sourceFingerprint!=='string'||!sha256.test(sourceFingerprint))throw Error('english_episode_fingerprint_invalid');
 return `lessons/${canonical.lessonId}/episode-v${canonical.contentVersion}-${sourceFingerprint}-r${ENGLISH_EPISODE_RENDER_REVISION}.mp3`;
}

export type EnglishEpisodeSourceContract=Readonly<{
 identity:Readonly<BoundIdentity>;
 renderProfile:typeof ENGLISH_EPISODE_RENDER_PROFILE;
 renderRevision:typeof ENGLISH_EPISODE_RENDER_REVISION;
 sourceFingerprint:string;
 storagePath:string;
}>;

/** Fingerprint is computed over the complete ordered cue and provider recipe
 * by the renderer; this binds it to the exact DB lesson and immutable path. */
export function createEnglishEpisodeSourceContract(value:unknown):EnglishEpisodeSourceContract{
 if(!exactKeys(value,['identity','sourceFingerprint']))throw Error('english_episode_contract_invalid');
 const input=value as {identity:unknown;sourceFingerprint:unknown};
 const identity=canonicalEnglishEpisodeIdentity(input.identity);
 if(typeof input.sourceFingerprint!=='string'||!sha256.test(input.sourceFingerprint))
  throw Error('english_episode_fingerprint_invalid');
 return Object.freeze({identity,renderProfile:ENGLISH_EPISODE_RENDER_PROFILE,renderRevision:ENGLISH_EPISODE_RENDER_REVISION,
  sourceFingerprint:input.sourceFingerprint,storagePath:immutableEnglishEpisodeStoragePath(identity,input.sourceFingerprint)});
}
