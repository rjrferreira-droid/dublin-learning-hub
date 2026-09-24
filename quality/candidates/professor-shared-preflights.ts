import {createAdmissionVault,AdmissionVaultUnavailable,type AdmissionScope} from './professor-admission-vault.ts';
import type {PrivateAdmissionSnapshot} from './prepare-bound-professor-admission.ts';
/** Service client only. Ciphertext never leaves this server adapter. No TTL reclaim. */
export function createSharedPreflights(serviceDb:any,vault:ReturnType<typeof createAdmissionVault>){
 return {
  async put(snapshot:PrivateAdmissionSnapshot){
   const captured=structuredClone(snapshot),r=captured.receipt;
   try{
    const result=await serviceDb.rpc('put_professor_preflight_v1',{p_reference_id:r.reference.id,p_user_id:r.userId,p_request_id:r.requestId,p_sealed:vault.seal(captured)});
    if(result.error||result.data!==true)throw Error();
   }catch{throw new AdmissionVaultUnavailable();}
  },
  async consume(scope:AdmissionScope){
   const captured={...scope};
   try{
    const result=await serviceDb.rpc('consume_professor_preflight_v1',{p_reference_id:captured.referenceId,p_user_id:captured.userId,p_request_id:captured.requestId});
    if(result.error||typeof result.data!=='string')throw Error();
    // A lost reply, decrypt failure or expired envelope stays consumed in SQL.
    return vault.open(result.data,captured);
   }catch{throw new AdmissionVaultUnavailable();}
  },
 };
}
