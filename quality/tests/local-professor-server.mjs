/** Local HTTP acceptance host. Never started by Vercel or the product app. */
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
import {createLocalProfessorRoutes} from '../candidates/professor-local-routes.ts';
const status=JSON.parse(readFileSync(process.argv[2],'utf8')),api=new URL(status.API_URL);
if(process.env.SUPABASE_ACCESS_TOKEN||api.protocol!=='http:'||!['127.0.0.1','localhost'].includes(api.hostname)||api.port!=='54321')throw Error('Disposable loopback backend required');
const originalFetch=globalThis.fetch;
globalThis.fetch=(input,init)=>{const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);if(url.origin!==api.origin)throw Error('Nonlocal request blocked');return originalFetch(input,{...init,redirect:'error'});};
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const serviceDb=createClient(api.origin,status.SERVICE_ROLE_KEY,options);
const makeClient=token=>{const client=createClient(api.origin,status.ANON_KEY,{...options,global:{headers:{Authorization:'Bearer '+token}}});return {auth:{getUser:()=>client.auth.getUser(token)},from:client.from.bind(client),rpc:client.rpc.bind(client)};};
const route=createLocalProfessorRoutes({makeClient,serviceDb,env:{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feat/professor-experience-2026-09-13'}});
const allowedOrigin='http://127.0.0.1:4173';
const server=createServer(async(req,res)=>{
 const send=(code,body)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin',...(req.headers.origin===allowedOrigin?{'Access-Control-Allow-Origin':allowedOrigin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type'}:{})});res.end(JSON.stringify(body));};
 if(req.headers.host!=='127.0.0.1:4174')return send(403,{error:'host_forbidden'});
 if(req.url==='/health'&&req.method==='GET')return send(200,{ready:true});
 if(req.headers.origin!==allowedOrigin)return send(403,{error:'origin_forbidden'});
 if(req.method==='OPTIONS')return send(204,null);
 if(req.method!=='POST')return send(405,{error:'method_not_allowed'});
 if(!/^application\/json(?:;.*)?$/i.test(req.headers['content-type']??''))return send(415,{error:'json_required'});
 let bytes=0;const chunks=[];
 try{
  for await(const chunk of req.iterator({destroyOnReturn:false})){bytes+=chunk.length;if(bytes>4096){req.resume();return send(413,{error:'request_too_large'});}chunks.push(chunk);}
  let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return send(400,{error:'invalid_json'});}
  const result=await route(req.url,req.headers.authorization,body);return send(result.status,result.body);
 }catch{if(!res.headersSent)send(503,{error:'local_route_unavailable'});}
});
server.requestTimeout=10000;server.headersTimeout=10000;
server.listen(4174,'127.0.0.1',()=>console.log('Local Professor routes ready'));
