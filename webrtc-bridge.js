(()=>{
  const SUPABASE_URL='https://qwvsrcgsfoguxdbcdrxq.supabase.co';
  const SUPABASE_KEY='sb_publishable_k1VAFbFj5ARYfOOUYhQacQ_wSruDD_Z';
  const OPENAI_CALL_URL='https://api.openai.com/v1/realtime/calls';
  const originalFetch=window.fetch.bind(window);

  function looksLikeJwt(value){
    return typeof value==='string' && /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value.trim());
  }

  function decodeMaybeBase64(value){
    if(typeof value!=='string')return value;
    const raw=value.startsWith('base64-')?value.slice(7):value;
    if(!value.startsWith('base64-'))return value;
    try{
      const normalized=raw.replace(/-/g,'+').replace(/_/g,'/');
      const padded=normalized+'='.repeat((4-normalized.length%4)%4);
      return decodeURIComponent(Array.from(atob(padded)).map(c=>'%'+c.charCodeAt(0).toString(16).padStart(2,'0')).join(''));
    }catch{return value}
  }

  function findAccessToken(value,depth=0){
    if(!value||depth>8)return null;
    if(looksLikeJwt(value))return value.trim();
    if(typeof value==='string'){
      const decoded=decodeMaybeBase64(value);
      if(decoded!==value){
        const nested=findAccessToken(decoded,depth+1);
        if(nested)return nested;
      }
      try{
        const parsed=JSON.parse(value);
        const nested=findAccessToken(parsed,depth+1);
        if(nested)return nested;
      }catch{}
      const jwt=value.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
      if(jwt)return jwt[0];
      return null;
    }
    if(typeof value==='object'){
      if(looksLikeJwt(value.access_token))return value.access_token.trim();
      if(value.currentSession){const nested=findAccessToken(value.currentSession,depth+1);if(nested)return nested;}
      if(value.session){const nested=findAccessToken(value.session,depth+1);if(nested)return nested;}
      for(const v of Object.values(value)){const found=findAccessToken(v,depth+1);if(found)return found;}
    }
    return null;
  }

  function scanStorage(storage){
    if(!storage)return null;
    for(let i=0;i<storage.length;i++){
      const key=storage.key(i)||'';
      const raw=storage.getItem(key);
      const token=findAccessToken(raw);
      if(token)return token;
    }
    return null;
  }

  function getSupabaseAccessToken(){
    try{
      return scanStorage(window.localStorage)||scanStorage(window.sessionStorage)||null;
    }catch{return null}
  }

  async function extractSdp(body){
    if(body instanceof FormData){
      const value=body.get('sdp');
      if(value instanceof Blob)return await value.text();
      return String(value||'');
    }
    if(typeof body==='string'){
      try{return String(JSON.parse(body)?.sdp||'')}catch{return body.startsWith('v=0')?body:''}
    }
    return '';
  }

  window.fetch=async function(input,init={}){
    const url=typeof input==='string'?input:input?.url||'';
    if(!url.startsWith(OPENAI_CALL_URL))return originalFetch(input,init);

    const headers=new Headers(init.headers||{});
    const auth=headers.get('Authorization')||'';
    const clientSecret=auth.replace(/^Bearer\s+/i,'').trim();
    const sdp=await extractSdp(init.body);
    const accessToken=getSupabaseAccessToken();

    if(!clientSecret||!sdp||!accessToken){
      const missing={client_secret:!clientSecret,sdp:!sdp,supabase_session:!accessToken};
      window.__DLH_WEBRTC_LAST_ERROR={stage:'bridge_credentials',missing,at:new Date().toISOString()};
      console.error('DLH WebRTC bridge missing credentials',missing);
      return new Response(JSON.stringify({error:'webrtc_bridge_missing_credentials',missing}),{status:400,headers:{'Content-Type':'application/json'}});
    }

    const bridge=await originalFetch(`${SUPABASE_URL}/functions/v1/webrtc-signal`,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization':`Bearer ${accessToken}`,
        'apikey':SUPABASE_KEY,
      },
      body:JSON.stringify({sdp,client_secret:clientSecret}),
    });

    let data={};
    try{data=await bridge.json()}catch{}
    if(!bridge.ok||!data.sdp_answer){
      window.__DLH_WEBRTC_LAST_ERROR={stage:'supabase_signal',status:bridge.status,data,at:new Date().toISOString()};
      console.error('DLH WebRTC signaling failed',bridge.status,data);
      return new Response(JSON.stringify(data||{error:'webrtc_bridge_failed'}),{status:bridge.status||502,headers:{'Content-Type':'application/json'}});
    }

    window.__DLH_WEBRTC_LAST_ERROR=null;
    return new Response(data.sdp_answer,{status:200,headers:{'Content-Type':'application/sdp'}});
  };
})();
