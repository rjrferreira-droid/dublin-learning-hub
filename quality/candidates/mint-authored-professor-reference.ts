const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** Only call with a server-resolved reference and the matching verified Auth user. */
export async function mintAuthenticatedProfessorReference<T extends {identity:unknown;descriptor:{sha256:string;version:string}}>(serviceDb:any,userId:string,reference:T){
 const {data:ticket,error:mintError}=await serviceDb.rpc('create_written_professor_reference_v1',{
  p_user_id:userId,p_identity:reference.identity,p_source_sha256:reference.descriptor.sha256,p_descriptor_version:reference.descriptor.version,
 });
 if(mintError)throw Error('written_preview_mint_rejected');
 if(!ticket||ticket.source_sha256!==reference.descriptor.sha256||ticket.descriptor_version!==reference.descriptor.version
  ||typeof ticket.reference_id!=='string'||!uuid.test(ticket.reference_id)
  ||typeof ticket.expires_at!=='string'||!Number.isFinite(Date.parse(ticket.expires_at))||Date.parse(ticket.expires_at)<=Date.now())throw Error('written_preview_mint_invalid');
 return {reference,ticket,userId};
}
