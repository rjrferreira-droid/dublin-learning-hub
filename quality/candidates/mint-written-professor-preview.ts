import {resolveAuthenticatedWrittenProfessorPreview} from './resolve-written-professor-preview.ts';
import {mintAuthenticatedProfessorReference} from './mint-authored-professor-reference.ts';
/** Unmounted server adapter. Both clients must be request-scoped; serviceDb must
 * never inherit the learner Authorization header. No browser content/hash/user ID
 * is accepted, and minting does not reserve budget or authorize any provider. */
export async function mintWrittenProfessorPreview(db:any,serviceDb:any,input:Parameters<typeof resolveAuthenticatedWrittenProfessorPreview>[1],env:Record<string,string|undefined>){
 const {reference,userId}=await resolveAuthenticatedWrittenProfessorPreview(db,input,env);
 return mintAuthenticatedProfessorReference(serviceDb,userId,reference);
}
