import {createClient} from '@supabase/supabase-js';
import {createPreviewConfigurationHandler} from '../server/preview-configuration.ts';

export default createPreviewConfigurationHandler(process.env,(url,key,token)=>createClient(url,key,{
 auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
 global:{...(token?{headers:{Authorization:`Bearer ${token}`}}:{}),fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(8000)})},
}));
