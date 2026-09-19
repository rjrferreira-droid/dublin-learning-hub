import {constants} from 'node:fs';
import {open,mkdir,lstat,link,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createAdmissionVault,AdmissionVaultUnavailable,type AdmissionScope} from './professor-admission-vault.ts';
import {resumeBoundProfessorAdmission,type PrivateAdmissionSnapshot} from './prepare-bound-professor-admission.ts';
import {isUuid} from './professor-admission-contract.ts';
import {isP1FeaturePreview} from '../../server/p1-preview-runtime.ts';
/** LOCAL ACCEPTANCE ONLY. Exclusive filesystem claims coordinate processes on
 * one private POSIX directory, NOT Vercel instances/regions. No automatic claim
 * deletion or expiry reclaim. Production needs a reviewed transactional store. */
export async function createFilePreflights(root:string,vault:ReturnType<typeof createAdmissionVault>){
 await mkdir(root,{recursive:true,mode:0o700});const stat=await lstat(root);
 if(!stat.isDirectory()||stat.isSymbolicLink()||(stat.mode&0o077)!==0)throw new AdmissionVaultUnavailable();
 const path=(id:string,suffix:string)=>{if(!isUuid(id))throw new AdmissionVaultUnavailable();return join(root,id+suffix);};
 const syncDirectory=async()=>{const dir=await open(root,'r');try{await dir.sync();}finally{await dir.close();}};
 return {
  async put(snapshot:PrivateAdmissionSnapshot){
   const dest=path(snapshot.receipt.reference.id,'.sealed'),temp=join(root,randomUUID()+'.tmp');
   const encoded=vault.seal(snapshot);let file;
   try{file=await open(temp,'wx',0o600);await file.writeFile(encoded);await file.sync();await file.close();file=undefined;
    await link(temp,dest);await syncDirectory();
   }catch{throw new AdmissionVaultUnavailable();}
   finally{await file?.close();await unlink(temp).catch(()=>{});}
  },
  async consume(scope:AdmissionScope){
   try{
    const record=await open(path(scope.referenceId,'.sealed'),constants.O_RDONLY|constants.O_NOFOLLOW);
    let encoded:string;
    try{const info=await record.stat();if(!info.isFile()||(info.mode&0o077)!==0||info.size>90000)throw new AdmissionVaultUnavailable();encoded=await record.readFile('utf8');}finally{await record.close();}
    const snapshot=vault.open(encoded,scope);
    // Commit consumption BEFORE admission. Even a partial marker or a lost
    // response blocks reuse; it never proves zero cost or permits another start.
    const file=await open(path(scope.referenceId,'.claimed'),'wx',0o600);
    try{await file.writeFile('consumed\n');await file.sync();}finally{await file.close();}
    await syncDirectory();return snapshot;
   }catch{throw new AdmissionVaultUnavailable();}
  },
 };
}
export async function resumePersistedProfessorAdmission(store:Awaited<ReturnType<typeof createFilePreflights>>,db:any,scope:AdmissionScope,env:Record<string,string|undefined>){
 if(!isP1FeaturePreview(env))throw new AdmissionVaultUnavailable();
 const expected={...scope};let auth;
 try{auth=await db.auth.getUser();}catch{throw new AdmissionVaultUnavailable();}
 if(auth.error||auth.data?.user?.id!==expected.userId)throw new AdmissionVaultUnavailable();
 const snapshot=await store.consume(expected);
 return resumeBoundProfessorAdmission(db,snapshot,env);
}
