import {createClient} from '@supabase/supabase-js';
import {createPremiumAudioReadinessHandler} from '../server/premium-audio-readiness.ts';

export default createPremiumAudioReadinessHandler((token:string)=>{
 const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
 const key=process.env.SUPABASE_PUBLISHABLE_KEY||process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
 if(url!=='https://aazfyosqqeujureksqjs.supabase.co'||!key)throw Error('preview_configuration_unavailable');
 return createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
},process.env);
