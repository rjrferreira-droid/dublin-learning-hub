/** Test harness allowlist, not application authorization. Actual Supabase Auth/RLS stays authoritative. */
export const TEST_UI_ORIGIN='http://127.0.0.1:4173';
export const V2_AUTH_ORIGIN='https://aazfyosqqeujureksqjs.supabase.co';
const privateTables=new Set(['profiles','ai_tutor_sessions','user_competency_scores','user_error_bank','spaced_reviews']);
const catalogTables=new Set(['courses','modules','lessons','competencies','lesson_competencies','lesson_terms','lesson_sources','questions','cases','audio_assets']);
export function ownerReadPolicy(raw,method,userId=null){
 let url;try{url=new URL(raw);}catch{return {allow:false,kind:'invalid_url'};}
 if(url.username||url.password||url.hash)return {allow:false,kind:'invalid_url'};
 const read=method==='GET'||method==='HEAD';
 if(url.origin===TEST_UI_ORIGIN)return url.pathname.startsWith('/api/')||!read?{allow:false,kind:'blocked_provider'}:{allow:true,kind:'ui'};
 if(url.origin!==V2_AUTH_ORIGIN)return {allow:false,kind:'external'};
 const p=url.pathname;
 if(method==='OPTIONS'&&(p.startsWith('/auth/v1/')||p.startsWith('/rest/v1/')||p==='/functions/v1/learning-hub-cost-center'))return {allow:true,kind:'cors'};
 if(p==='/auth/v1/token'&&method==='POST'&&url.searchParams.get('grant_type')==='password')return {allow:true,kind:'login'};
 if(p==='/auth/v1/token'&&method==='POST'&&url.searchParams.get('grant_type')==='refresh_token'&&userId)return {allow:true,kind:'refresh'};
 if(p==='/auth/v1/user'&&read&&userId)return {allow:true,kind:'auth_read'};
 if(p==='/auth/v1/logout'&&method==='POST'&&userId&&url.searchParams.getAll('scope').length===1&&url.searchParams.get('scope')==='local')return {allow:true,kind:'logout_local'};
 if(p.startsWith('/auth/'))return {allow:false,kind:'blocked_auth_change'};
 if(p.startsWith('/rest/v1/')){
  const table=p.slice('/rest/v1/'.length);
  if(!read)return {allow:false,kind:'blocked_learning_write'};
  if(!userId||! /^[a-f0-9-]{36}$/i.test(userId))return {allow:false,kind:'blocked_read_scope'};
  if(catalogTables.has(table))return {allow:true,kind:'catalog_read',table};
  const column=table==='profiles'?'id':'user_id';
  if(!privateTables.has(table)||url.searchParams.getAll(column).length!==1||url.searchParams.get(column)!=='eq.'+userId)return {allow:false,kind:'blocked_read_scope'};
  return {allow:true,kind:'private_read',table};
 }
 if(p==='/functions/v1/learning-hub-cost-center'&&userId&&(read||method==='POST'))return {allow:true,kind:'cost_read'};
 return {allow:false,kind:'blocked_provider'};
}
