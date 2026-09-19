import {createClient} from '@supabase/supabase-js';
import {createProfessorReadinessHandler} from '../server/professor-readiness.ts';

export default createProfessorReadinessHandler((token:string)=>{
 const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
 const key=process.env.SUPABASE_PUBLISHABLE_KEY||process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
 // This feature route can read only the approved V2 backend, using the learner JWT.
 if(url!=='https://aazfyosqqeujureksqjs.supabase.co'||!key)throw Error('preview_configuration_unavailable');
 return createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
},process.env);
