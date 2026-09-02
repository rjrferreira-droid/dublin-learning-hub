import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL='https://qwvsrcgsfoguxdbcdrxq.supabase.co';
const SUPABASE_KEY='sb_publishable_k1VAFbFj5ARYfOOUYhQacQ_wSruDD_Z';
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);

const $=s=>document.querySelector(s);
let session=null;
let profile=null;
let lessons=[];

function setMessage(el,msg,type=''){
  el.textContent=msg||'';
  el.className=`message ${type}`.trim();
}

function trackLabel(track){
  return track==='rafael_finance'?'Global Finance • ACCA • Ireland':'Irish Payroll • HR Operations';
}

async function invokeEdge(name,body){
  if(!session?.access_token)return {ok:false,status:401,data:{error:'unauthorized'}};
  try{
    const res=await fetch(`${SUPABASE_URL}/functions/v1/${name}`,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization':`Bearer ${session.access_token}`,
        'apikey':SUPABASE_KEY,
      },
      body:JSON.stringify(body),
    });
    let data={};
    try{data=await res.json();}catch{}
    return {ok:res.ok,status:res.status,data};
  }catch(err){
    return {ok:false,status:0,data:{error:'network_error',message:err?.message||String(err)}};
  }
}

async function loadLearner(){
  const uid=session.user.id;
  const {data:p,error:profileError}=await supabase.from('profiles').select('*').eq('id',uid).maybeSingle();
  if(profileError)throw profileError;
  profile=p;
  if(!profile)throw new Error('Perfil não encontrado.');

  const {data:course,error:courseError}=await supabase.from('courses').select('id').eq('learner_track',profile.learner_track).eq('is_active',true).maybeSingle();
  if(courseError)throw courseError;
  if(!course)throw new Error('Curso ativo não encontrado.');

  const {data:modules,error:modulesError}=await supabase.from('modules').select('id').eq('course_id',course.id).eq('is_published',true);
  if(modulesError)throw modulesError;
  const ids=(modules||[]).map(m=>m.id);
  if(!ids.length){lessons=[];return;}

  const {data:l,error:lessonError}=await supabase.from('lessons')
    .select('id,title,week_number,day_number,estimated_minutes')
    .in('module_id',ids)
    .eq('is_published',true)
    .order('week_number')
    .order('day_number');
  if(lessonError)throw lessonError;
  lessons=l||[];
}

function renderLearner(){
  $('#profileName').textContent=profile.display_name||session.user.email;
  $('#trackName').textContent=trackLabel(profile.learner_track);
  const select=$('#lessonSelect');
  select.innerHTML=lessons.map(l=>`<option value="${l.id}">W${l.week_number} D${l.day_number} — ${l.title}</option>`).join('');
  $('#authCard').classList.add('hidden');
  $('#labApp').classList.remove('hidden');
}

async function enterLab(s){
  session=s;
  setMessage($('#authMessage'),'Carregando trilha…');
  try{
    await loadLearner();
    renderLearner();
    setMessage($('#authMessage'),'');
  }catch(err){
    setMessage($('#authMessage'),err.message||'Não foi possível carregar o laboratório.','error');
  }
}

$('#loginBtn').addEventListener('click',async()=>{
  const btn=$('#loginBtn');
  btn.disabled=true;
  setMessage($('#authMessage'),'Entrando…');
  try{
    const {data,error}=await supabase.auth.signInWithPassword({email:$('#email').value.trim(),password:$('#password').value});
    if(error)throw error;
    if(!data.session)throw new Error('Sessão não criada.');
    await enterLab(data.session);
  }catch(err){
    setMessage($('#authMessage'),err.message||'Falha no login.','error');
  }finally{btn.disabled=false;}
});

$('#logoutBtn').addEventListener('click',async()=>{
  await supabase.auth.signOut();
  session=null;profile=null;lessons=[];
  $('#labApp').classList.add('hidden');
  $('#authCard').classList.remove('hidden');
});

$('#audioBtn').addEventListener('click',async()=>{
  const lessonId=$('#lessonSelect').value;
  const lesson=lessons.find(l=>l.id===lessonId);
  if(!lessonId)return;
  const btn=$('#audioBtn');
  btn.disabled=true;
  $('#audioPlayer').innerHTML='';
  setMessage($('#audioStatus'),'Preparando áudio premium…');

  const result=await invokeEdge('premium-lesson-audio',{lesson_id:lessonId});
  if(!result.ok){
    const code=result.data?.error;
    const msg=code==='ai_budget_reached'
      ?'O limite mensal de IA foi atingido e o sistema bloqueou a geração para proteger o orçamento.'
      :code==='openai_not_configured'
        ?'A chave da OpenAI não está configurada no backend.'
        :`Não foi possível gerar o áudio (${result.status||'rede'}${code?` • ${code}`:''}).`;
    setMessage($('#audioStatus'),msg,'error');
    btn.disabled=false;
    return;
  }

  const url=result.data?.audio_url;
  if(!url){
    setMessage($('#audioStatus'),'O backend respondeu sem URL de áudio.','error');
    btn.disabled=false;
    return;
  }

  const mode=result.data.cached?'Áudio carregado do cache — sem nova geração.':'Novo áudio gerado e salvo.';
  const cost=result.data.estimated_cost_usd!=null?` Custo estimado: US$ ${Number(result.data.estimated_cost_usd).toFixed(4)}.`:'';
  setMessage($('#audioStatus'),`${mode}${cost}`,'success');
  $('#audioPlayer').innerHTML=`<div class="player-title">${lesson?.title||'Premium Audio'}</div><audio controls autoplay src="${url}"></audio>`;
  btn.disabled=false;
});

supabase.auth.onAuthStateChange((event,newSession)=>{
  if(event==='TOKEN_REFRESHED'&&newSession)session=newSession;
});

const {data:{session:existing}}=await supabase.auth.getSession();
if(existing)await enterLab(existing);
