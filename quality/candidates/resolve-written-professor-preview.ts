import {readAuthenticatedProfessorIdentity} from '../../server/professor-preview-identity.ts';
import {prepareWrittenProfessorReference} from './written-professor-reference.ts';
export {readAuthenticatedProfessorIdentity} from '../../server/professor-preview-identity.ts';
type Request=Parameters<typeof readAuthenticatedProfessorIdentity>[1];

export async function resolveAuthenticatedWrittenProfessorPreview(db:any,input:Request,env:Record<string,string|undefined>){
 const {userId,referenceInput}=await readAuthenticatedProfessorIdentity(db,input,env);
 return {userId,reference:await prepareWrittenProfessorReference(referenceInput)};
}

export async function resolveWrittenProfessorPreview(db:any,input:Request,env:Record<string,string|undefined>){
 return (await resolveAuthenticatedWrittenProfessorPreview(db,input,env)).reference;
}
