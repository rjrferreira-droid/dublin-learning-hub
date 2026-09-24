import {useEffect,useRef,useState} from 'react';
import {supabase} from '../services/supabase';
import {loadAccountStudyState,saveAccountStudyState} from '../services/accountStudyState';
export type ChoiceResponse={selected:string[];draft:string;attempts:number;revealed:boolean;correct?:boolean};
export type ChoiceResponses=Record<string,ChoiceResponse>;
type Progress={reviewed:boolean;listened:boolean;responses:ChoiceResponses};
const initial=():Progress=>({reviewed:false,listened:false,responses:{}});
function parse(value:unknown):Progress{
 const raw=value as Partial<Progress>|null,responses:ChoiceResponses={};
 if(raw?.responses&&typeof raw.responses==='object')for(const [key,row] of Object.entries(raw.responses)){
  if(key.length>150||!row||!Array.isArray(row.selected)||row.selected.length>20||!row.selected.every(value=>typeof value==='string'&&value.length<=150)||!Number.isInteger(row.attempts)||row.attempts<0||row.attempts>2)continue;
  responses[key]={selected:row.selected,draft:'',attempts:row.attempts,revealed:row.revealed===true,correct:typeof row.correct==='boolean'?row.correct:undefined};
 }
 return {reviewed:raw?.reviewed===true,listened:raw?.listened===true,responses};
}
export function useEnglishUnitProgress(lessonId:string,enabled:boolean){
 const [progress,setProgress]=useState<Progress>(initial),[ready,setReady]=useState(!enabled),[saved,setSaved]=useState(false),[error,setError]=useState(''),[reload,setReload]=useState(0);
 const userId=useRef('');const lastSaved=useRef('');
 const namespace=`english-unit.${lessonId}` as const;
 useEffect(()=>{
  if(!enabled)return;
  let current=true;setReady(false);setError('');
  void (async()=>{
   const {data:{session}}=await supabase.auth.getSession();if(!session)throw Error('Sign in to save unit progress.');
   const data=await loadAccountStudyState(session.user.id,namespace);
   if(current){const next=parse(data);userId.current=session.user.id;lastSaved.current=JSON.stringify(next);setProgress(next);setReady(true);setSaved(true);}
  })().catch(()=>{if(current)setError('Unit progress could not be loaded. Reload it before continuing.');});
  return()=>{current=false;};
 },[enabled,namespace,reload]);
 useEffect(()=>{
  if(!enabled||!ready||!userId.current)return;
  const safe=parse(progress),encoded=JSON.stringify(safe);
  if(encoded===lastSaved.current)return;
  let current=true;setSaved(false);
  void saveAccountStudyState(userId.current,namespace,safe).then(()=>{if(current){lastSaved.current=encoded;setSaved(true);setError('');}}).catch(()=>{if(current)setError('Progress could not sync. Keep this lesson open and retry saving.');});
  return()=>{current=false;};
 },[enabled,namespace,progress,ready]);
 return {progress,setProgress,ready,saved,error,retry:()=>{if(ready)setProgress(current=>({...current}));else setReload(value=>value+1);}};
}
