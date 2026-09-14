import {resolveAuthenticatedWrittenProfessorPreview} from './resolve-written-professor-preview.ts';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** Unmounted server adapter. Both clients must be request-scoped; serviceDb must
 * never inherit the learner Authorization header. No browser content/hash/user ID
 * is accepted, and minting does not reserve budget or authorize any provider. */
export async function mintWrittenProfessorPreview(db:any,serviceDb:any,input:Parameters<typeof resolveAuthenticatedWrittenProfessorPreview>[1],env:Record<string,string|undefined>){
 const {reference,userId}=await resolveAuthenticatedWrittenProfessorPreview(db,input,env);
 const {data:ticket,error:mintError}=await serviceDb.rpc('create_written_professor_reference_v1',{
  p_user_id:userId,p_identity:reference.identity,p_source_sha256:reference.descriptor.sha256,p_descriptor_version:reference.descriptor.version,
 });
 if(mintError)throw Error('written_preview_mint_rejected');
 if(!ticket||ticket.source_sha256!==reference.descriptor.sha256||ticket.descriptor_version!==reference.descriptor.version
  ||typeof ticket.reference_id!=='string'||!uuid.test(ticket.reference_id)
  ||typeof ticket.expires_at!=='string'||!Number.isFinite(Date.parse(ticket.expires_at))||Date.parse(ticket.expires_at)<=Date.now())throw Error('written_preview_mint_invalid');
 return {reference,ticket};
}
