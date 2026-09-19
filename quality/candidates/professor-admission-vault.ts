import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {isUuid} from './professor-admission-contract.ts';
import type {PrivateAdmissionSnapshot} from './prepare-bound-professor-admission.ts';
export type AdmissionScope={referenceId:string;userId:string;requestId:string};
export class AdmissionVaultUnavailable extends Error{readonly retryAllowed=false;constructor(){super('professor_vault_unavailable');}}
const keysExact=(v:any,keys:string[])=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
function decode(v:unknown){if(typeof v!=='string'||!/^[A-Za-z0-9_-]+$/.test(v))throw new AdmissionVaultUnavailable();const bytes=Buffer.from(v,'base64url');if(bytes.toString('base64url')!==v)throw new AdmissionVaultUnavailable();return bytes;}
/** Private server envelope. AAD binds owner, reference, request, version, key ID
 * and expiry. No access/refresh/service token or runtime client is serialized. */
export function createAdmissionVault(activeKeyId:string,keyring:Record<string,Uint8Array>,now=Date.now){
 const keys=new Map(Object.entries(keyring).map(([id,key])=>[id,Buffer.from(key)]));
 if(!/^[A-Za-z0-9_-]{1,40}$/.test(activeKeyId)||keys.get(activeKeyId)?.length!==32||[...keys.values()].some(k=>k.length!==32))throw new AdmissionVaultUnavailable();
 return {
  seal(snapshot:PrivateAdmissionSnapshot){
   if(!keysExact(snapshot,['receipt','callbackToken','roomName','lessonContext']))throw new AdmissionVaultUnavailable();
   const {receipt}=snapshot,issuedAt=now();
   const header={version:1,keyId:activeKeyId,referenceId:receipt.reference.id,userId:receipt.userId,requestId:receipt.requestId,issuedAt,expiresAt:issuedAt+240000};
   if(![header.referenceId,header.userId,header.requestId].every(isUuid)||!Number.isSafeInteger(issuedAt))throw new AdmissionVaultUnavailable();
   const plaintext=Buffer.from(JSON.stringify(snapshot));if(plaintext.length>64000)throw new AdmissionVaultUnavailable();
   const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',keys.get(activeKeyId)!,iv);cipher.setAAD(Buffer.from(JSON.stringify(header)));
   const ciphertext=Buffer.concat([cipher.update(plaintext),cipher.final()]);
   return JSON.stringify({header,iv:iv.toString('base64url'),ciphertext:ciphertext.toString('base64url'),tag:cipher.getAuthTag().toString('base64url')});
  },
  open(encoded:string,scope:AdmissionScope):PrivateAdmissionSnapshot{
   try{
    if(typeof encoded!=='string'||Buffer.byteLength(encoded)>90000)throw Error();
    const value=JSON.parse(encoded),h=value.header;
    if(!keysExact(value,['header','iv','ciphertext','tag'])||!keysExact(h,['version','keyId','referenceId','userId','requestId','issuedAt','expiresAt'])
     ||h.version!==1||!keys.has(h.keyId)||h.referenceId!==scope.referenceId||h.userId!==scope.userId||h.requestId!==scope.requestId
     ||![h.referenceId,h.userId,h.requestId].every(isUuid)||!Number.isSafeInteger(h.issuedAt)||!Number.isSafeInteger(h.expiresAt)
     ||h.expiresAt-h.issuedAt!==240000||now()<h.issuedAt||now()>=h.expiresAt)throw Error();
    const iv=decode(value.iv),tag=decode(value.tag);if(iv.length!==12||tag.length!==16)throw Error();
    const decipher=createDecipheriv('aes-256-gcm',keys.get(h.keyId)!,iv);decipher.setAAD(Buffer.from(JSON.stringify(h)));decipher.setAuthTag(tag);
    const plaintext=Buffer.concat([decipher.update(decode(value.ciphertext)),decipher.final()]);if(plaintext.length>64000)throw Error();
    const snapshot=JSON.parse(plaintext.toString('utf8'));
    if(snapshot.receipt?.reference?.id!==scope.referenceId||snapshot.receipt?.userId!==scope.userId||snapshot.receipt?.requestId!==scope.requestId)throw Error();
    return snapshot;
   }catch{throw new AdmissionVaultUnavailable();}
  },
 };
}
