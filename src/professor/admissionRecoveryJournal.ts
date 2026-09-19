import {assertProfessorReferenceReceipt,isUuid,type ReferenceReceipt} from '../../quality/candidates/professor-admission-contract.ts';

type Storage=Pick<globalThis.Storage,'getItem'|'setItem'>&Partial<Pick<globalThis.Storage,'removeItem'>>;
const prefix='lh.preview-admission-recovery.v1:';
function valid(receipt:ReferenceReceipt,userId:string){
 assertProfessorReferenceReceipt(receipt,{userId,requestId:receipt?.requestId,mode:receipt?.mode,identity:receipt?.reference?.identity});
}
function serialized(receipt:ReferenceReceipt,userId:string){
 valid(receipt,userId);const value=JSON.stringify({version:1,receipt});
 if(value.length>4096)throw Error('invalid_recovery_record');return value;
}
/** A per-account, per-tab public pointer for read-only recovery across reloads.
 * Not evidence of admission, authorization, cancellation or learning. Never
 * expires or clears an uncertain attempt automatically. Server Auth remains
 * authoritative even when browser storage is altered. No tokens or drafts. */
export function createAdmissionRecoveryJournal(storage:Storage,userId:string){
 if(!isUuid(userId))throw Error('invalid_recovery_owner');
 const key=prefix+userId;
 return {
  read():ReferenceReceipt|null{
   const raw=storage.getItem(key);
   if(raw===null)return null;
   if(raw.length>4096)throw Error('invalid_recovery_record');
   const record=JSON.parse(raw);
   if(!record||Object.keys(record).length!==2||record.version!==1||!Object.hasOwn(record,'receipt'))throw Error('invalid_recovery_record');
   valid(record.receipt,userId);return structuredClone(record.receipt);
  },
  save(receipt:ReferenceReceipt){
   const value=serialized(receipt,userId);
   const previous=storage.getItem(key);
   // Never overwrite an earlier attempt, even a corrupt or stale one.
   if(previous!==null&&previous!==value)throw Error('recovery_required');
   storage.setItem(key,value);
   if(storage.getItem(key)!==value)throw Error('recovery_storage_unavailable');
  },
  /** Clear only the exact checkpoint after the server definitively reports that
   * this request created no reservation. Uncertain/admitted attempts stay put. */
  clear(receipt:ReferenceReceipt){
   const value=serialized(receipt,userId);
   if(storage.getItem(key)!==value||typeof storage.removeItem!=='function')throw Error('recovery_required');
   storage.removeItem(key);
   if(storage.getItem(key)!==null)throw Error('recovery_storage_unavailable');
  },
 };
}
