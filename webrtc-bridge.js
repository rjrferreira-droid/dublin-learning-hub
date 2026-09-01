(()=>{
  const SUPABASE_URL='https://qwvsrcgsfoguxdbcdrxq.supabase.co';
  const SUPABASE_KEY='sb_publishable_k1VAFbFj5ARYfOOUYhQacQ_wSruDD_Z';
  const OPENAI_CALL_URL='https://api.openai.com/v1/realtime/calls';
  const originalFetch=window.fetch.bind(window);

  function findAccessToken(value){
    if(!value)return null;
    if(typeof value==='object'){
      if(typeof value.access_token==='string')return value.access_token;
      for(const v of Object.values(value)){const found=findAccessToken(v);if(found)return found;}
    }
    return null;
  }

  function getSupabaseAccessToken(){
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i)||'';
      if(!key.includes('auth-token'))continue;
      try{
        const parsed=JSON.parse(localStorage.getItem(key)||'null');
        const token=findAccessToken(parsed);
        if(token)return token;
      }catch{}
    }
    return null;
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
      return new Response(JSON.stringify({error:'webrtc_bridge_missing_credentials'}),{status:400,headers:{'Content-Type':'application/json'}});
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
      return new Response(JSON.stringify(data||{error:'webrtc_bridge_failed'}),{status:bridge.status||502,headers:{'Content-Type':'application/json'}});
    }

    return new Response(data.sdp_answer,{status:200,headers:{'Content-Type':'application/sdp'}});
  };
})();
