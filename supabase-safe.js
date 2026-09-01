import { createClient as realCreateClient } from 'https://esm.sh/@supabase/supabase-js@2?dlh-real=1';

export function createClient(...args){
  const client=realCreateClient(...args);
  const originalOnAuthStateChange=client.auth.onAuthStateChange.bind(client.auth);

  client.auth.onAuthStateChange=(callback)=>originalOnAuthStateChange((event,session)=>{
    // premium-v2 already restores an existing session in init().
    // Do not let background auth maintenance reset the current view to Dashboard.
    if(event==='INITIAL_SESSION' || event==='TOKEN_REFRESHED' || event==='USER_UPDATED') return;
    return callback(event,session);
  });

  return client;
}
