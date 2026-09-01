import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL='https://qwvsrcgsfoguxdbcdrxq.supabase.co';
const SUPABASE_KEY='sb_publishable_k1VAFbFj5ARYfOOUYhQacQ_wSruDD_Z';
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmtDate=d=>new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(d));
const todayISO=()=>new Date().toISOString().slice(0,10);
const addDays=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};

let authMode='signin';
let session=null;
let profile=null;
let course=null;
let modules=[];
let competencies=[];
let lessons=[];
let progress=[];
let reviews=[];
let currentView='dashboard';
let activeLesson=null;
let activeLessonData=null;
let lessonAudio=null;

const tutor={
  pc:null,dc:null,stream:null,remoteAudio:null,sessionId:null,startedAt:null,
  turnCounter:0,seen:new Set(),usage:{input_tokens:0,output_tokens:0,audio_input_tokens:0,audio_output_tokens:0},
  voiceResolver:null,voiceObservations:null,ending:false
};

const authScreen=$('#authScreen');
const appShell=$('#appShell');
const contentArea=$('#contentArea');
const authMessage=$('#authMessage');

function toast(msg){const t=$('#toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000)}
function setAuthMessage(msg,ok=false){authMessage.textContent=msg;authMessage.classList.toggle('success',ok)}
function trackLabel(t){return t==='rafael_finance'?'Global Finance • ACCA • Ireland':'Irish Payroll • HR Operations'}
function initials(name){return String(name||'DL').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()}
function scoreColor(v){return v<70?'red':v<80?'amber':'green'}
function avg(arr){return arr.length?Math.round(arr.reduce((a,b)=>a+b,0)/arr.length):0}
function moduleIcon(cat){const map={global_core:'Σ',corporate:'↗',ireland:'☘',leadership:'◎',career:'◈',ireland_payroll:'€',operations:'⇄',controls:'✓',systems:'⌘'};return map[cat]||'◆'}
function paragraphize(text){if(!text)return '<p class="muted">Conteúdo em preparação.</p>';return String(text).split(/\n{2,}/).map(p=>`<p>${esc(p).replace(/\n/g,'<br>')}</p>`).join('')}

async function invokeEdge(name,body){
  const token=session?.access_token;
  if(!token)return {ok:false,status:401,data:{error:'unauthorized'}};
  try{
    const res=await fetch(`${SUPABASE_URL}/functions/v1/${name}`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`,'apikey':SUPABASE_KEY},body:JSON.stringify(body)});
    let data={};try{data=await res.json()}catch{}
    return {ok:res.ok,status:res.status,data};
  }catch(err){return {ok:false,status:0,data:{error:'network_error',message:err?.message||String(err)}}}
}

function friendlyAiError(result){
  const code=result?.data?.error;
  if(code==='openai_not_configured')return 'A estrutura premium já está pronta. Falta apenas ativar a chave da OpenAI para liberar esta função.';
  if(code==='ai_budget_reached')return 'O limite mensal de IA foi atingido. O Learning Hub bloqueou novas chamadas para proteger o orçamento.';
  if(code==='unauthorized')return 'Sua sessão expirou. Entre novamente no Learning Hub.';
  if(result?.status===429)return 'A IA está temporariamente limitada. Tente novamente em alguns instantes.';
  return 'Não foi possível conectar a IA agora. Sua aula e seu progresso continuam salvos.';
}

$$('.auth-tab').forEach(b=>b.addEventListener('click',()=>{
  authMode=b.dataset.authMode;
  $$('.auth-tab').forEach(x=>x.classList.toggle('active',x===b));
  $('#signupFields').classList.toggle('hidden',authMode!=='signup');
  $('#authSubmit').textContent=authMode==='signin'?'Entrar':'Criar acesso';
  $('#password').autocomplete=authMode==='signin'?'current-password':'new-password';
  setAuthMessage('');
}));

$('#authForm').addEventListener('submit',async e=>{
  e.preventDefault();setAuthMessage('');
  const email=$('#email').value.trim(),password=$('#password').value;
  $('#authSubmit').disabled=true;
  try{
    if(authMode==='signin'){
      const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;
    }else{
      const display_name=$('#displayName').value.trim()||'Learner',learner_track=$('#learnerTrack').value;
      const {data,error}=await supabase.auth.signUp({email,password,options:{data:{display_name,learner_track}}});if(error)throw error;
      if(!data.session){setAuthMessage('Conta criada. Confirme o e-mail enviado pelo Supabase e depois entre aqui.',true);return}
    }
  }catch(err){setAuthMessage(err.message||'Não foi possível autenticar.')}finally{$('#authSubmit').disabled=false}
});

$('#logoutBtn').addEventListener('click',async()=>{await cleanupTutor(false);await supabase.auth.signOut()});
$('#refreshBtn').addEventListener('click',async()=>{await loadAppData();renderCurrent();toast('Dados atualizados.')});
$$('.nav-item[data-view]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.view)));

supabase.auth.onAuthStateChange(async(_event,newSession)=>{
  session=newSession;
  if(session){authScreen.classList.add('hidden');appShell.classList.remove('hidden');await loadAppData();navigate('dashboard')}
  else{appShell.classList.add('hidden');authScreen.classList.remove('hidden')}
});

async function init(){
  $('#todayLabel').textContent=new Intl.DateTimeFormat('pt-BR',{weekday:'short',day:'2-digit',month:'short'}).format(new Date());
  const {data:{session:s}}=await supabase.auth.getSession();session=s;
  if(session){authScreen.classList.add('hidden');appShell.classList.remove('hidden');await loadAppData();navigate('dashboard')}
}

async function loadAppData(){
  if(!session)return;
  contentArea.innerHTML='<div class="grid cols-3"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>';
  const uid=session.user.id;
  const {data:p}=await supabase.from('profiles').select('*').eq('id',uid).maybeSingle();
  if(!p){const md=session.user.user_metadata||{};const fallback={id:uid,display_name:md.display_name||session.user.email.split('@')[0],learner_track:md.learner_track||'rafael_finance'};await supabase.from('profiles').insert(fallback);profile=fallback}else profile=p;
  const {data:c}=await supabase.from('courses').select('*').eq('learner_track',profile.learner_track).eq('is_active',true).maybeSingle();course=c;if(!course)return;
  const [mRes,compRes,progRes,revRes]=await Promise.all([
    supabase.from('modules').select('*').eq('course_id',course.id).eq('is_published',true).order('sequence'),
    supabase.from('competencies').select('*').eq('learner_track',profile.learner_track).order('category').order('name'),
    supabase.from('user_lesson_progress').select('*').eq('user_id',uid),
    supabase.from('spaced_reviews').select('*,lessons(id,title,slug)').eq('user_id',uid).lte('due_date',todayISO()).in('status',['scheduled','due']).order('due_date')
  ]);
  modules=mRes.data||[];competencies=compRes.data||[];progress=progRes.data||[];reviews=revRes.data||[];
  if(modules.length){const {data:l}=await supabase.from('lessons').select('*').in('module_id',modules.map(x=>x.id)).eq('is_published',true).order('week_number').order('day_number');lessons=l||[]}else lessons=[];
  const {data:scores}=await supabase.from('user_competency_scores').select('*').eq('user_id',uid);
  competencies=competencies.map(c=>({...c,userScore:(scores||[]).find(s=>s.competency_id===c.id)?.score||0,evidence:(scores||[]).find(s=>s.competency_id===c.id)?.evidence_count||0}));
  $('#profileName').textContent=profile.display_name;$('#profileTrack').textContent=trackLabel(profile.learner_track);$('#avatar').textContent=initials(profile.display_name);
}

async function navigate(view){
  if(tutor.pc)await cleanupTutor(false);
  if(lessonAudio){lessonAudio.pause();lessonAudio=null}
  currentView=view;activeLesson=null;activeLessonData=null;
  $$('.nav-item[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));renderCurrent();
}
function header(title,subtitle,eyebrow='LEARNING HUB'){$('#pageTitle').textContent=title;$('#pageSubtitle').textContent=subtitle;$('#pageEyebrow').textContent=eyebrow}
function renderCurrent(){if(activeLesson)return renderLesson();if(currentView==='dashboard')return renderDashboard();if(currentView==='study')return renderStudy();if(currentView==='practice')return renderPractice();if(currentView==='revision')return renderRevision();if(currentView==='assessments')return renderAssessments();if(currentView==='performance')return renderPerformance()}

function readinessData(){
  const completed=progress.filter(p=>p.status==='completed').length,courseProgress=lessons.length?Math.round(completed/lessons.length*100):0,assessed=competencies.filter(c=>c.evidence>0),competencyAvg=avg(assessed.map(c=>Number(c.userScore)));
  if(profile.learner_track==='rafael_finance'){
    const global=avg(assessed.filter(c=>['IFRS','FM','PM','CTRL','TREAS','LEAD','SAP','ENG'].includes(c.code)).map(c=>Number(c.userScore)));
    const ireland=avg(assessed.filter(c=>['IRE','GOV','TAX'].includes(c.code)).map(c=>Number(c.userScore)));
    return [{label:'ACCA / Global Finance',value:global},{label:'Corporate Readiness',value:competencyAvg},{label:'Ireland Readiness',value:ireland},{label:'Course progress',value:courseProgress}]
  }
  const payroll=avg(assessed.filter(c=>['G2N','PAYE','USC','PRSI','LIFE'].includes(c.code)).map(c=>Number(c.userScore))),ops=avg(assessed.filter(c=>['RECON','CTRL','SYS'].includes(c.code)).map(c=>Number(c.userScore))),eng=avg(assessed.filter(c=>c.code==='ENG').map(c=>Number(c.userScore)));
  return [{label:'Irish Payroll',value:payroll},{label:'Payroll Operations',value:ops},{label:'Professional English',value:eng},{label:'Course progress',value:courseProgress}]
}
function metricCard(m){const has=m.value>0;return `<div class="metric-card"><div class="metric-top"><div><div class="metric-label">${esc(m.label)}</div><div class="metric-value">${has?m.value+'%':'—'}</div></div><div class="ring" style="--p:${m.value}"></div></div><div class="progress-bar ${scoreColor(m.value)}"><div style="width:${m.value}%"></div></div><div class="metric-note">${has?(m.value<70?'Prioridade de desenvolvimento':m.value<80?'Em consolidação':'Bom domínio'):'Será calculado após suas primeiras avaliações'}</div></div>`}
function nextLesson(){return lessons.find(l=>!progress.find(p=>p.lesson_id===l.id&&p.status==='completed'))||lessons[0]||null}

function renderDashboard(){
  header(`Olá, ${profile.display_name.split(' ')[0]}.`,'Seu estudo de hoje, revisões e evolução de competências.','TODAY');
  const next=nextLesson(),metrics=readinessData(),weak=competencies.filter(c=>c.evidence>0&&c.userScore<70).sort((a,b)=>a.userScore-b.userScore).slice(0,5);
  contentArea.innerHTML=`<div class="card hero"><div class="eyebrow">CONTINUE STUDYING</div><h3>${next?esc(next.title):'Sua trilha premium está pronta'}</h3><p class="muted">${next?`${next.estimated_minutes} min • Semana ${next.week_number} • Dia ${next.day_number}`:'Novas aulas aparecerão aqui conforme forem publicadas.'}</p><div class="hero-actions">${next?`<button class="btn primary" data-open-lesson="${next.id}">Continuar aula</button>`:''}<button class="btn ghost" data-go="revision">Ver revisões (${reviews.length})</button></div></div>
  <div class="section-title"><h3>Readiness</h3><span>baseado em evidências de avaliação</span></div><div class="grid cols-4">${metrics.map(metricCard).join('')}</div>
  <div class="grid cols-2"><div><div class="section-title"><h3>Due today</h3><span>D+1 / D+7 / D+30 / D+90</span></div><div class="card">${reviews.length?reviews.slice(0,6).map(r=>`<div class="review-item"><div class="review-dot"></div><div><strong>${esc(r.lessons?.title||'Revisão')}</strong><span>${esc(r.review_stage)} • ${fmtDate(r.due_date)}</span></div><button class="btn soft" ${r.lessons?.id?`data-open-lesson="${r.lessons.id}"`:''}>Revisar</button></div>`).join(''):'<div class="empty"><strong>Nenhuma revisão vencida.</strong>O sistema agenda revisões automaticamente depois das aulas.</div>'}</div></div>
  <div><div class="section-title"><h3>Needs attention</h3><span>score &lt; 70%</span></div><div class="card">${weak.length?`<div class="competency-list">${weak.map(competencyRow).join('')}</div>`:'<div class="empty"><strong>Ainda sem gaps identificados.</strong>Complete avaliações para gerar seu mapa de fraquezas.</div>'}</div></div></div>`;bindDynamic();
}
function competencyRow(c){const v=Math.round(c.userScore||0);return `<div class="competency-row"><div><h5>${esc(c.name)}</h5><div class="progress-bar ${scoreColor(v)}"><div style="width:${v}%"></div></div></div><div class="score">${c.evidence?v+'%':'—'}</div></div>`}

function renderStudy(){
  header('Study','Conteúdo estruturado por módulos, com Global Core e Ireland Overlay.','STRUCTURED LEARNING');
  contentArea.innerHTML=`<div class="grid cols-2">${modules.map(m=>{const ls=lessons.filter(l=>l.module_id===m.id),done=ls.filter(l=>progress.find(p=>p.lesson_id===l.id&&p.status==='completed')).length;return `<div class="card module-card" data-module="${m.id}"><div class="module-icon">${moduleIcon(m.category)}</div><div><h4>${esc(m.title)}</h4><p>${esc(m.description)}</p><div class="module-meta"><span class="pill blue">${m.global_core_weight}% Global/Core</span><span class="pill green">${m.ireland_overlay_weight}% Ireland</span><span class="pill">${done}/${ls.length} aulas</span></div></div><span class="pill">Abrir →</span></div>`}).join('')}</div><div id="moduleLessons"></div>`;
  $$('[data-module]').forEach(el=>el.addEventListener('click',()=>renderModule(el.dataset.module)));
}
function renderModule(id){const m=modules.find(x=>x.id===id),ls=lessons.filter(l=>l.module_id===id),target=$('#moduleLessons');target.innerHTML=`<div class="section-title"><h3>${esc(m.title)}</h3><span>${ls.length} aulas publicadas</span></div><div class="card">${ls.length?ls.map((l,i)=>{const p=progress.find(x=>x.lesson_id===l.id);return `<div class="lesson-row" data-open-lesson="${l.id}"><div class="lesson-number">${p?.status==='completed'?'✓':String(i+1).padStart(2,'0')}</div><div><h5>${esc(l.title)}</h5><p>Semana ${l.week_number} • Dia ${l.day_number} • ${l.estimated_minutes} min • ${esc(l.level)}</p></div><span class="pill ${p?.status==='completed'?'green':'blue'}">${p?.status==='completed'?'Concluída':'Estudar'}</span></div>`}).join(''):'<div class="empty"><strong>Conteúdo em preparação.</strong></div>'}</div>`;bindDynamic();target.scrollIntoView({behavior:'smooth',block:'start'})}

async function openLesson(id){
  if(tutor.pc)await cleanupTutor(false);if(lessonAudio){lessonAudio.pause();lessonAudio=null}
  activeLesson=lessons.find(l=>l.id===id);if(!activeLesson)return;contentArea.innerHTML='<div class="skeleton"></div>';
  const [src,terms,qs,cases,visuals,audios,tutorSessions]=await Promise.all([
    supabase.from('lesson_sources').select('*').eq('lesson_id',id).order('sequence'),
    supabase.from('lesson_terms').select('*').eq('lesson_id',id).order('sequence'),
    supabase.from('questions').select('*').eq('lesson_id',id).eq('is_published',true).order('section').order('sequence'),
    supabase.from('cases').select('*').eq('lesson_id',id).order('sequence'),
    supabase.from('visual_challenges').select('*').eq('lesson_id',id).order('sequence'),
    supabase.from('audio_assets').select('*').eq('lesson_id',id),
    supabase.from('ai_tutor_sessions').select('id,status,technical_score,english_score,grammar_score,vocabulary_score,fluency_score,pronunciation_score,professional_communication_score,final_feedback,completed_at').eq('lesson_id',id).eq('user_id',session.user.id).eq('status','completed').order('completed_at',{ascending:false}).limit(3)
  ]);
  activeLessonData={sources:src.data||[],terms:terms.data||[],questions:qs.data||[],cases:cases.data||[],visuals:visuals.data||[],audios:audios.data||[],tutorSessions:tutorSessions.data||[]};
  await markStarted(id);renderLesson();
}
async function markStarted(id){const old=progress.find(p=>p.lesson_id===id);if(old)return;await supabase.from('user_lesson_progress').upsert({user_id:session.user.id,lesson_id:id,status:'in_progress',started_at:new Date().toISOString(),last_activity_at:new Date().toISOString()},{onConflict:'user_id,lesson_id'})}

function renderLesson(){
  const l=activeLesson,d=activeLessonData;if(!l||!d)return;header(l.title,`Semana ${l.week_number} • Dia ${l.day_number} • ${l.estimated_minutes} min`,'PREMIUM LESSON');
  contentArea.innerHTML=`<div class="lesson-shell"><div class="lesson-banner"><div class="breadcrumb">${esc(course.title)} / Semana ${l.week_number}</div><h3>${esc(l.title)}</h3><p>${esc(l.subtitle||'Technical lesson • practical application • assessment')}</p></div>
  <div class="lesson-tabs"><button class="lesson-tab active" data-ltab="notes">📖 Notes</button><button class="lesson-tab" data-ltab="audio">🎧 Audio</button><button class="lesson-tab" data-ltab="english">🇬🇧 English</button><button class="lesson-tab" data-ltab="practice">🧠 Practice</button><button class="lesson-tab" data-ltab="visual">🖼 Visual</button><button class="lesson-tab professor-tab" data-ltab="professor">🎙️ Professor</button><button class="lesson-tab" data-ltab="case">💼 Case</button><button class="lesson-tab" data-ltab="test">✅ Test</button><button class="lesson-tab" data-ltab="sources">📚 Sources</button></div><div id="lessonPane"></div></div>`;
  $$('.lesson-tab').forEach(b=>b.addEventListener('click',async()=>{if(b.dataset.ltab!=='professor'&&tutor.pc)await cleanupTutor(false);$$('.lesson-tab').forEach(x=>x.classList.toggle('active',x===b));renderLessonPane(b.dataset.ltab)}));renderLessonPane('notes');
}

function renderLessonPane(tab){
  const l=activeLesson,d=activeLessonData,pane=$('#lessonPane');if(!pane)return;
  if(tab==='notes')pane.innerHTML=`<div class="lesson-content">${(l.learning_objectives||[]).length?`<div class="objective-box"><strong>Ao final desta aula você deve conseguir:</strong><ul>${l.learning_objectives.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}<h4>Technical Brief</h4>${paragraphize(l.technical_brief_pt)}${l.global_core_pt?`<h4>ACCA / Global Core</h4>${paragraphize(l.global_core_pt)}`:''}${l.ireland_overlay_pt?`<h4>Ireland Overlay</h4>${paragraphize(l.ireland_overlay_pt)}`:''}${l.worked_example_pt?`<h4>Worked Example</h4><div class="callout blue">${paragraphize(l.worked_example_pt)}</div>`:''}${l.common_mistakes_pt?`<h4>Common mistakes & risks</h4><div class="callout amber">${paragraphize(l.common_mistakes_pt)}</div>`:''}${l.interview_angle_pt?`<h4>Interview / Manager angle</h4><div class="callout green">${paragraphize(l.interview_angle_pt)}</div>`:''}<div class="hero-actions"><button class="btn primary" data-next-tab="practice">Knowledge check →</button></div></div>`;
  if(tab==='audio')renderAudioPane(pane);
  if(tab==='english')pane.innerHTML=`<div class="lesson-content"><h4>English Toolkit</h4><p>Vocabulário técnico aplicado à aula, com definição e frase profissional.</p><div class="term-grid">${d.terms.length?d.terms.map(t=>`<div class="term-card"><h5>${esc(t.term_en)}</h5><div class="translation">${esc(t.translation_pt)}</div><p>${esc(t.definition_en)}</p><p><em>${esc(t.example_en)}</em></p><button class="speak" data-speak="${esc(t.term_en)}">🔊 Ouvir</button></div>`).join(''):'<div class="empty"><strong>Toolkit em preparação.</strong></div>'}</div><div class="callout green"><strong>Próxima etapa:</strong> na aba Professor, você usa esse vocabulário em uma conversa oral real em inglês.</div></div>`;
  if(tab==='practice')pane.innerHTML=questionSection('checkpoint','Knowledge Check','Perguntas curtas para validar a leitura antes do caso.');
  if(tab==='visual')pane.innerHTML=visualSection();
  if(tab==='professor')pane.innerHTML=professorSection();
  if(tab==='case')pane.innerHTML=caseSection();
  if(tab==='test')pane.innerHTML=questionSection('final_test','Final Test','Questões técnicas e de aplicação. O resultado alimenta seu competency map.');
  if(tab==='sources')pane.innerHTML=`<div class="lesson-content"><h4>Official & Technical Sources</h4><p>Conteúdo revisado em: <strong>${l.source_last_reviewed?fmtDate(l.source_last_reviewed):'a definir'}</strong></p>${d.sources.length?d.sources.map(s=>`<div class="source-item"><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)} ↗</a><span>${esc(s.publisher||'')} • ${esc(s.source_type||'source')}${s.note?' • '+esc(s.note):''}</span></div>`).join(''):'<div class="empty"><strong>Fontes em preparação.</strong></div>'}</div>`;
  $$('[data-next-tab]').forEach(b=>b.addEventListener('click',()=>{$(`[data-ltab="${b.dataset.nextTab}"]`)?.click()}));
  $$('[data-speak]').forEach(b=>b.addEventListener('click',()=>speak(b.dataset.speak,'en-GB')));
  $$('.grade-quiz').forEach(b=>b.addEventListener('click',()=>gradeQuiz(b.dataset.section)));
  $('#saveCase')?.addEventListener('click',saveCase);
  $('#showModel')?.addEventListener('click',()=>{$('#caseModel')?.classList.toggle('hidden')});
  $('#startProfessor')?.addEventListener('click',startProfessorConversation);
  $('#endProfessor')?.addEventListener('click',endProfessorConversation);
  $('#muteProfessor')?.addEventListener('click',toggleTutorMute);
  $('#playPremiumAudio')?.addEventListener('click',playPremiumAudio);
  $('#stopAudio')?.addEventListener('click',()=>{if(lessonAudio){lessonAudio.pause();lessonAudio.currentTime=0}speechSynthesis.cancel()});
}

function renderAudioPane(pane){
  const cached=activeLessonData.audios.find(a=>a.audio_type==='commentary'&&a.storage_path);
  pane.innerHTML=`<div class="lesson-content"><div class="audio-premium-head"><div><span class="pill purple">PREMIUM VOICE</span><h4>Professor Commentary</h4><p>Uma explicação complementar à leitura, com foco em aplicação profissional — não apenas leitura do texto.</p></div><div class="voice-badge">🎙 Marin</div></div><div class="callout blue">${paragraphize(activeLesson.manager_commentary_pt||'O professor commentary desta aula está sendo preparado.')}</div><div id="audioPlayerArea">${cached?'<p class="muted">Áudio premium já gerado e armazenado para esta aula.</p>':'<p class="muted">Na primeira reprodução, o áudio premium é gerado uma vez e fica em cache para os próximos acessos.</p>'}</div><div class="hero-actions"><button class="btn primary" id="playPremiumAudio">▶ Ouvir voz premium</button><button class="btn" id="stopAudio">■ Parar</button></div></div>`;
}
async function playPremiumAudio(){
  const btn=$('#playPremiumAudio'),area=$('#audioPlayerArea');if(btn)btn.disabled=true;if(area)area.innerHTML='<div class="ai-loading"><span></span> Preparando o professor commentary…</div>';
  const r=await invokeEdge('premium-lesson-audio',{lesson_id:activeLesson.id});
  if(r.ok&&r.data.audio_url){
    if(lessonAudio)lessonAudio.pause();lessonAudio=new Audio(r.data.audio_url);lessonAudio.preload='auto';lessonAudio.play().catch(()=>{});
    if(area)area.innerHTML=`<audio class="premium-audio" controls autoplay src="${esc(r.data.audio_url)}"></audio><p class="muted">${r.data.cached?'Áudio carregado do cache.':'Áudio premium gerado e salvo para reutilização.'}</p>`;
  }else{
    if(area)area.innerHTML=`<div class="callout amber"><strong>Premium voice aguardando ativação.</strong><p>${esc(friendlyAiError(r))}</p><p>Enquanto isso, o navegador pode reproduzir um fallback local.</p></div>`;
    speak(activeLesson.manager_commentary_pt||activeLesson.technical_brief_pt,'pt-BR');
  }
  if(btn)btn.disabled=false;
}
function speak(text,lang='pt-BR'){if(!('speechSynthesis'in window)){toast('Áudio não suportado neste navegador.');return}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=lang;u.rate=.95;speechSynthesis.speak(u)}

function visualSection(){const vs=activeLessonData.visuals||[];return `<div class="lesson-content"><h4>Visual Challenge</h4><p>Use o cenário visual para raciocinar antes de abrir a solução.</p>${vs.length?vs.map((v,i)=>`<div class="visual-challenge-card"><div class="visual-challenge-head"><span class="pill purple">Challenge ${i+1}</span><span class="pill">${esc(v.asset_type)}</span></div><h4>${esc(v.title)}</h4><p>${esc(v.instructions_pt)}</p><div class="visual-placeholder">${renderVisual(v)}</div><details class="visual-solution"><summary>Ver resposta e explicação</summary><div class="visual-answer">${prettyVisual(v.answer_key)}</div><p>${esc(v.explanation_pt||'')}</p></details></div>`).join(''):'<div class="empty"><strong>Visual challenge em preparação.</strong></div>'}</div>`}
function renderVisual(v){if(v.asset_type==='timeline')return '<div class="timeline-visual"><span>Reporting date</span><b>→</b><span>Event</span><b>→</b><span>Authorisation</span></div>';if(v.asset_type==='flow')return '<div class="flow-visual"><span>Input</span><b>→</b><span>Calculation</span><b>→</b><span>Review</span><b>→</b><span>Output</span></div>';if(v.asset_type==='calculation')return '<div class="calc-visual"><div><strong>Facts</strong><span>Inputs</span></div><div>→</div><div><strong>Result</strong><span>Decision</span></div></div>';return '<div class="diagram-visual"><div>Source / facts</div><b>→</b><div>Rule / judgement</div><b>→</b><div>Accounting / payroll output</div></div>'}
function prettyVisual(v){if(v==null)return '';if(Array.isArray(v))return `<ul>${v.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;if(typeof v==='object')return Object.entries(v).map(([k,x])=>`<div class="visual-answer-row"><strong>${esc(k.replaceAll('_',' '))}</strong><span>${esc(Array.isArray(x)?x.join(' → '):x)}</span></div>`).join('');return esc(v)}

function professorSection(){
  const past=activeLessonData.tutorSessions||[];
  return `<div class="lesson-content professor-pane"><div class="professor-hero"><div class="professor-orb">🎙️</div><div><span class="pill purple">AI PROFESSOR • LIVE ENGLISH</span><h4>Chapter Conversation</h4><p>Conversa oral sobre <strong>${esc(activeLesson.title)}</strong>. O professor adapta as perguntas às suas respostas e avalia conhecimento técnico + inglês profissional.</p></div></div>
  <div class="professor-specs"><div><strong>5–8 min</strong><span>duração sugerida</span></div><div><strong>English</strong><span>conversa principal</span></div><div><strong>Adaptive</strong><span>follow-ups dinâmicos</span></div><div><strong>2 scores</strong><span>technical + English</span></div></div>
  <div class="callout green"><strong>Como funciona:</strong> o professor faz uma pergunta por vez. Responda como responderia em uma reunião ou entrevista. Ele pode desafiar sua resposta, pedir exemplos e explorar lacunas antes de explicar.</div>
  <div id="professorStage" class="professor-stage idle"><div id="professorStatus"><strong>Pronto para começar.</strong><p>Ao iniciar, o navegador pedirá acesso ao microfone.</p></div><div id="conversationTranscript" class="conversation-transcript"></div><div id="professorControls" class="professor-controls"><button class="btn primary large" id="startProfessor">🎙️ Start conversation</button><button class="btn soft hidden" id="muteProfessor">Mute</button><button class="btn danger hidden" id="endProfessor">End & Evaluate</button></div></div>
  <div id="professorEvaluation"></div>
  ${past.length?`<div class="section-title"><h3>Previous conversations</h3><span>${past.length} recentes</span></div><div class="session-history">${past.map(renderPastSession).join('')}</div>`:''}</div>`;
}
function renderPastSession(s){return `<div class="session-history-row"><div><strong>${s.completed_at?fmtDate(s.completed_at):'Sessão'}</strong><span>Technical ${Math.round(s.technical_score||0)}% • English ${Math.round(s.english_score||0)}%</span></div><div class="score-pair"><span class="pill ${scoreColor(s.technical_score||0)}">T ${Math.round(s.technical_score||0)}</span><span class="pill ${scoreColor(s.english_score||0)}">EN ${Math.round(s.english_score||0)}</span></div></div>`}

async function startProfessorConversation(){
  const start=$('#startProfessor'),stage=$('#professorStage'),status=$('#professorStatus');if(start)start.disabled=true;if(status)status.innerHTML='<div class="ai-loading"><span></span> Conectando ao professor…</div>';
  const r=await invokeEdge('ai-tutor-session',{lesson_id:activeLesson.id,mode:'chapter_conversation'});
  if(!r.ok){if(status)status.innerHTML=`<div class="callout amber"><strong>Professor AI aguardando ativação.</strong><p>${esc(friendlyAiError(r))}</p></div>`;if(start)start.disabled=false;return}
  try{
    tutor.sessionId=r.data.session_id;tutor.startedAt=Date.now();tutor.turnCounter=0;tutor.seen=new Set();tutor.usage={input_tokens:0,output_tokens:0,audio_input_tokens:0,audio_output_tokens:0};tutor.ending=false;
    tutor.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    tutor.pc=new RTCPeerConnection();tutor.remoteAudio=document.createElement('audio');tutor.remoteAudio.autoplay=true;tutor.remoteAudio.playsInline=true;tutor.pc.ontrack=e=>{tutor.remoteAudio.srcObject=e.streams[0]};tutor.stream.getTracks().forEach(track=>tutor.pc.addTrack(track,tutor.stream));
    tutor.dc=tutor.pc.createDataChannel('oai-events');tutor.dc.addEventListener('message',e=>handleRealtimeEvent(e.data));
    tutor.dc.addEventListener('open',()=>{setProfessorLive('Professor conectado. A primeira pergunta está chegando…','speaking');tutor.dc.send(JSON.stringify({type:'response.create'}))});
    tutor.dc.addEventListener('close',()=>{if(!tutor.ending)setProfessorLive('Conexão encerrada.','idle')});
    const offer=await tutor.pc.createOffer();await tutor.pc.setLocalDescription(offer);
    const form=new FormData();form.append('sdp',new Blob([offer.sdp],{type:'application/sdp'}),'offer.sdp');
    const sdpRes=await fetch('https://api.openai.com/v1/realtime/calls',{method:'POST',headers:{'Authorization':`Bearer ${r.data.client_secret}`},body:form});
    if(!sdpRes.ok)throw new Error(`Realtime connection failed (${sdpRes.status})`);
    const answer=await sdpRes.text();await tutor.pc.setRemoteDescription({type:'answer',sdp:answer});
    stage?.classList.remove('idle');stage?.classList.add('live');$('#startProfessor')?.classList.add('hidden');$('#muteProfessor')?.classList.remove('hidden');$('#endProfessor')?.classList.remove('hidden');
  }catch(err){console.error(err);setProfessorLive('Não foi possível abrir o microfone ou a conexão de voz. Verifique a permissão do navegador e tente novamente.','error');await cleanupTutor(false);if(start){start.disabled=false;start.classList.remove('hidden')}}
}

function setProfessorLive(text,state='listening'){const status=$('#professorStatus');if(status)status.innerHTML=`<div class="live-status ${state}"><span class="live-dot"></span><strong>${esc(text)}</strong></div>`}
function appendTranscript(speaker,text){if(!text?.trim())return;const box=$('#conversationTranscript');if(!box)return;const div=document.createElement('div');div.className=`conversation-bubble ${speaker}`;div.innerHTML=`<span>${speaker==='learner'?'You':'Professor'}</span><p>${esc(text)}</p>`;box.appendChild(div);box.scrollTop=box.scrollHeight}
async function saveTutorTurn(speaker,transcript){if(!tutor.sessionId||!transcript?.trim())return;const n=++tutor.turnCounter;await supabase.from('ai_tutor_turns').insert({session_id:tutor.sessionId,turn_number:n,speaker,transcript})}

function handleRealtimeEvent(raw){
  let ev;try{ev=JSON.parse(raw)}catch{return}
  if(ev.event_id&&tutor.seen.has(ev.event_id))return;if(ev.event_id)tutor.seen.add(ev.event_id);
  if(ev.type==='input_audio_buffer.speech_started')setProfessorLive('Listening…','listening');
  if(ev.type==='response.created')setProfessorLive('Professor is thinking…','thinking');
  if(ev.type==='response.output_audio.started'||ev.type==='output_audio_buffer.started')setProfessorLive('Professor speaking…','speaking');
  if(ev.type==='conversation.item.input_audio_transcription.completed'){
    const text=ev.transcript||'';appendTranscript('learner',text);saveTutorTurn('learner',text);
  }
  if(ev.type==='response.output_audio_transcript.done'){
    const text=ev.transcript||'';appendTranscript('tutor',text);saveTutorTurn('tutor',text);
  }
  if(ev.type==='response.done'){
    accumulateUsage(ev.response?.usage);
    if(ev.response?.metadata?.topic==='voice_assessment'&&tutor.voiceResolver){const text=extractRealtimeText(ev.response);let parsed=null;try{parsed=JSON.parse(text)}catch{}tutor.voiceObservations=parsed;tutor.voiceResolver(parsed);tutor.voiceResolver=null;return}
    if(!tutor.ending)setProfessorLive('Your turn.','listening');
  }
  if(ev.type==='error'){console.error('Realtime error',ev);if(!tutor.ending)setProfessorLive('A conexão teve um erro. Você pode encerrar e avaliar o que já foi conversado.','error')}
}
function accumulateUsage(u){if(!u)return;tutor.usage.input_tokens+=Number(u.input_tokens||0);tutor.usage.output_tokens+=Number(u.output_tokens||0);const det=u.input_token_details||u.input_tokens_details||{};const od=u.output_token_details||u.output_tokens_details||{};tutor.usage.audio_input_tokens+=Number(det.audio_tokens||0);tutor.usage.audio_output_tokens+=Number(od.audio_tokens||0)}
function extractRealtimeText(response){let out='';for(const item of response?.output||[])for(const c of item?.content||[])out+=c.text||c.transcript||'';return out}
function toggleTutorMute(){const track=tutor.stream?.getAudioTracks?.()[0];if(!track)return;track.enabled=!track.enabled;const b=$('#muteProfessor');if(b)b.textContent=track.enabled?'Mute':'Unmute';setProfessorLive(track.enabled?'Listening…':'Microphone muted','listening')}

async function requestVoiceAssessment(){
  if(!tutor.dc||tutor.dc.readyState!=='open')return null;
  return new Promise(resolve=>{
    tutor.voiceResolver=resolve;
    tutor.dc.send(JSON.stringify({type:'response.create',response:{conversation:'none',metadata:{topic:'voice_assessment'},output_modalities:['text'],instructions:'Based only on the learner audio you heard in this session, return ONLY valid JSON with keys pronunciation_score (0-100 or null), fluency_score (0-100), intelligibility (short string), pace_and_delivery (short string), pronunciation_notes (array of short strings). Evaluate intelligibility and professional spoken communication, not accent conformity. Do not penalize a Brazilian accent. If there is insufficient audio, use null scores.'}}));
    setTimeout(()=>{if(tutor.voiceResolver){tutor.voiceResolver(null);tutor.voiceResolver=null}},9000);
  });
}

async function endProfessorConversation(){
  if(tutor.ending)return;tutor.ending=true;$('#endProfessor')?.setAttribute('disabled','disabled');setProfessorLive('Finalizing your assessment…','thinking');
  const voice=await requestVoiceAssessment();const duration=Math.round((Date.now()-(tutor.startedAt||Date.now()))/1000);const sid=tutor.sessionId;const usage={...tutor.usage};await cleanupTutor(false);
  const evalBox=$('#professorEvaluation');if(evalBox)evalBox.innerHTML='<div class="ai-loading evaluation-loading"><span></span> Professor is grading technical knowledge and professional English…</div>';
  const r=await invokeEdge('ai-tutor-evaluate',{session_id:sid,duration_seconds:duration,voice_observations:voice,realtime_usage:usage});
  if(r.ok){if(evalBox)evalBox.innerHTML=renderTutorEvaluation(r.data.evaluation,r.data.estimated_cost_usd);toast('Professor Conversation avaliada e salva.');await loadAppData()}
  else if(evalBox)evalBox.innerHTML=`<div class="callout amber"><strong>Conversa salva.</strong><p>${esc(friendlyAiError(r))}</p></div>`;
  tutor.ending=false;
}

function renderTutorEvaluation(e,cost){if(!e)return '<div class="callout amber">Avaliação indisponível.</div>';const metrics=[['Technical',e.technical_score],['English',e.english_score],['Grammar',e.grammar_score],['Vocabulary',e.vocabulary_score],['Fluency',e.fluency_score],['Pronunciation',e.pronunciation_score],['Professional communication',e.professional_communication_score]].filter(x=>x[1]!=null);return `<div class="evaluation-card"><div class="evaluation-head"><div><span class="pill green">SESSION COMPLETE</span><h4>Professor Evaluation</h4></div>${cost!=null?`<span class="pill">AI cost ≈ $${Number(cost).toFixed(3)}</span>`:''}</div><div class="score-grid">${metrics.map(([k,v])=>`<div class="score-card"><span>${esc(k)}</span><strong>${Math.round(v)}%</strong><div class="progress-bar ${scoreColor(v)}"><div style="width:${v}%"></div></div></div>`).join('')}</div><div class="grid cols-2 feedback-grid"><div><h4>Technical feedback</h4>${paragraphize(e.technical_feedback)}<h4>Strengths</h4><ul>${(e.strengths||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div><h4>English feedback</h4>${paragraphize(e.english_feedback)}<h4>Gaps to review</h4><ul>${(e.gaps||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div>${(e.corrected_phrases||[]).length?`<h4>Better professional phrasing</h4><div class="phrase-corrections">${e.corrected_phrases.map(p=>`<div><span>${esc(p.original)}</span><b>→</b><strong>${esc(p.better)}</strong><small>${esc(p.why)}</small></div>`).join('')}</div>`:''}<div class="callout green"><strong>Overall</strong>${paragraphize(e.overall_feedback)}</div></div>`}

async function cleanupTutor(markAbandoned=false){
  const sid=tutor.sessionId;try{tutor.dc?.close()}catch{}try{tutor.pc?.close()}catch{}try{tutor.stream?.getTracks().forEach(t=>t.stop())}catch{}if(tutor.remoteAudio){try{tutor.remoteAudio.srcObject=null}catch{}}
  tutor.pc=null;tutor.dc=null;tutor.stream=null;tutor.remoteAudio=null;tutor.voiceResolver=null;
  if(markAbandoned&&sid)await supabase.from('ai_tutor_sessions').update({status:'abandoned',completed_at:new Date().toISOString()}).eq('id',sid).eq('user_id',session.user.id);
  tutor.sessionId=null;tutor.startedAt=null;
}

function questionSection(section,title,intro){const qs=activeLessonData.questions.filter(q=>q.section===section);return `<div class="lesson-content"><h4>${title}</h4><p>${intro}</p>${qs.length?qs.map((q,i)=>questionHTML(q,i)).join(''):'<div class="empty"><strong>Banco de questões em preparação.</strong></div>'}${qs.length?`<button class="btn primary grade-quiz" data-section="${section}">Corrigir ${section==='final_test'?'teste':'checkpoint'}</button><div id="quizResult-${section}"></div>`:''}</div>`}
function questionHTML(q,i){if(q.question_type==='mcq'||q.question_type==='visual_mcq'){const opts=Array.isArray(q.options)?q.options:(q.options?.options||[]);return `<div class="question-card" data-qid="${q.id}"><h5>${i+1}. ${esc(q.prompt_pt)}</h5>${opts.map((o,j)=>`<label class="option"><input type="radio" name="q-${q.id}" value="${j}"> ${esc(typeof o==='string'?o:(o.text||o.label||String(o)))}</label>`).join('')}</div>`}if(q.question_type==='true_false')return `<div class="question-card" data-qid="${q.id}"><h5>${i+1}. ${esc(q.prompt_pt)}</h5><label class="option"><input type="radio" name="q-${q.id}" value="true"> Verdadeiro</label><label class="option"><input type="radio" name="q-${q.id}" value="false"> Falso</label></div>`;return `<div class="question-card" data-qid="${q.id}"><h5>${i+1}. ${esc(q.prompt_pt)}</h5><textarea rows="4" data-answer="${q.id}" placeholder="Sua resposta..."></textarea></div>`}
function getCorrectIndex(q){const a=q.correct_answer;if(typeof a==='number')return String(a);if(typeof a==='string')return a;if(a&&typeof a==='object'){if(a.index!==undefined)return String(a.index);if(a.value!==undefined)return String(a.value);if(a.answer!==undefined)return String(a.answer)}return null}
async function gradeQuiz(section){
  const qs=activeLessonData.questions.filter(q=>q.section===section);let correct=0,answered=0,gradable=0;const attempts=[];
  for(const q of qs){let answer=null,isCorrect=null;if(['mcq','visual_mcq','true_false'].includes(q.question_type)){gradable++;answer=document.querySelector(`input[name="q-${q.id}"]:checked`)?.value??null;if(answer!==null){answered++;isCorrect=String(answer)===String(getCorrectIndex(q));if(isCorrect)correct++}}else{answer=document.querySelector(`[data-answer="${q.id}"]`)?.value?.trim()||null;if(answer)answered++}if(answer!==null)attempts.push({user_id:session.user.id,question_id:q.id,answer:{value:answer},is_correct:isCorrect,score:isCorrect===true?q.points:isCorrect===false?0:null})}
  if(answered<qs.length){toast('Responda todas as questões antes de corrigir.');return}if(attempts.length)await supabase.from('question_attempts').insert(attempts);const sc=gradable?Math.round(correct/gradable*100):0;const box=$(`#quizResult-${section}`);if(box)box.innerHTML=`<div class="result-box"><strong>Resultado: ${sc}%</strong><p>${sc>=80?'Bom domínio.':sc>=70?'Aprovado, mas vale revisar os pontos de dúvida.':'Gap identificado: esta competência voltará em revisão espaçada.'}</p></div>`;if(section==='final_test')await completeLesson(sc)
}

function caseSection(){const c=activeLessonData.cases[0];if(!c)return '<div class="lesson-content"><div class="empty"><strong>Case em preparação.</strong></div></div>';return `<div class="lesson-content"><div class="case-ai-head"><div><span class="pill purple">AI MARKING</span><h4>${esc(c.title)}</h4></div><span class="pill">Technical + Judgement + English</span></div><div class="callout blue">${paragraphize(c.scenario_pt)}</div><p><strong>Sua tarefa</strong></p>${paragraphize(c.prompt_pt)}<textarea id="caseAnswer" rows="9" placeholder="Estruture sua resposta como faria em uma situação profissional..."></textarea><div class="hero-actions"><button class="btn primary" id="saveCase">Enviar e corrigir com IA</button>${c.model_answer_pt?'<button class="btn soft" id="showModel">Ver modelo depois</button>':''}</div><div id="caseFeedback"></div>${c.model_answer_pt?`<div id="caseModel" class="hidden"><div class="callout green"><h4>Model answer</h4>${paragraphize(c.model_answer_pt)}</div></div>`:''}</div>`}
async function saveCase(){
  const c=activeLessonData.cases[0],response=$('#caseAnswer')?.value.trim();if(!response){toast('Escreva sua resposta primeiro.');return}const btn=$('#saveCase');if(btn)btn.disabled=true;const feedbackBox=$('#caseFeedback');if(feedbackBox)feedbackBox.innerHTML='<div class="ai-loading"><span></span> Salvando e preparando a correção…</div>';
  const {data:submission,error}=await supabase.from('case_submissions').insert({user_id:session.user.id,case_id:c.id,response_text:response}).select('id').single();if(error||!submission){if(feedbackBox)feedbackBox.innerHTML='<div class="callout amber">Não foi possível salvar a resposta.</div>';if(btn)btn.disabled=false;return}
  const r=await invokeEdge('ai-case-feedback',{submission_id:submission.id});
  if(r.ok){if(feedbackBox)feedbackBox.innerHTML=renderCaseFeedback(r.data.feedback,r.data.estimated_cost_usd);toast('Case corrigido por IA e salvo.');await loadAppData()}
  else if(feedbackBox)feedbackBox.innerHTML=`<div class="callout amber"><strong>Resposta salva.</strong><p>${esc(friendlyAiError(r))}</p><p>Você pode consultar o model answer enquanto a IA premium não está ativa.</p></div>`;
  if(btn)btn.disabled=false;
}
function renderCaseFeedback(f,cost){return `<div class="evaluation-card"><div class="evaluation-head"><div><span class="pill green">AI MARKED</span><h4>Case Feedback</h4></div>${cost!=null?`<span class="pill">AI cost ≈ $${Number(cost).toFixed(3)}</span>`:''}</div><div class="score-grid"><div class="score-card"><span>Technical</span><strong>${Math.round(f.technical_score)}%</strong></div><div class="score-card"><span>Judgement</span><strong>${Math.round(f.judgement_score)}%</strong></div><div class="score-card"><span>Structure</span><strong>${Math.round(f.structure_score)}%</strong></div><div class="score-card"><span>English</span><strong>${Math.round(f.english_score)}%</strong></div><div class="score-card total"><span>Total</span><strong>${Math.round(f.total_score)}%</strong></div></div><div class="grid cols-2 feedback-grid"><div><h4>What you did well</h4><ul>${(f.what_you_did_well||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div><h4>Missing / incorrect</h4><ul>${(f.missing_or_incorrect||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div><h4>English feedback</h4>${paragraphize(f.english_feedback)}${(f.better_phrasing||[]).length?`<div class="phrase-corrections">${f.better_phrasing.map(p=>`<div><span>${esc(p.original)}</span><b>→</b><strong>${esc(p.better)}</strong></div>`).join('')}</div>`:''}<details><summary>Better answer</summary>${paragraphize(f.better_answer)}</details></div>`}

async function completeLesson(score){
  const uid=session.user.id,l=activeLesson,now=new Date().toISOString(),old=progress.find(p=>p.lesson_id===l.id),best=Math.max(Number(old?.best_score||0),score);await supabase.from('user_lesson_progress').upsert({user_id:uid,lesson_id:l.id,status:'completed',started_at:old?.started_at||now,completed_at:now,best_score:best,latest_score:score,attempts:Number(old?.attempts||0)+1,last_activity_at:now},{onConflict:'user_id,lesson_id'});
  const existing=await supabase.from('spaced_reviews').select('id').eq('user_id',uid).eq('lesson_id',l.id).limit(1);if(!(existing.data||[]).length)await supabase.from('spaced_reviews').insert([{user_id:uid,lesson_id:l.id,review_stage:'D+1',due_date:addDays(1),status:'scheduled'},{user_id:uid,lesson_id:l.id,review_stage:'D+7',due_date:addDays(7),status:'scheduled'},{user_id:uid,lesson_id:l.id,review_stage:'D+30',due_date:addDays(30),status:'scheduled'},{user_id:uid,lesson_id:l.id,review_stage:'D+90',due_date:addDays(90),status:'scheduled'}]);
  const comps=await supabase.from('lesson_competencies').select('competency_id,weight').eq('lesson_id',l.id);for(const lc of comps.data||[]){const prev=competencies.find(c=>c.id===lc.competency_id),oldScore=Number(prev?.userScore||0),evidence=Number(prev?.evidence||0),newScore=evidence?Math.round((oldScore*evidence+score)/(evidence+1)):score;await supabase.from('user_competency_scores').upsert({user_id:uid,competency_id:lc.competency_id,score:newScore,confidence:Math.min(100,(evidence+1)*20),evidence_count:evidence+1,last_assessed_at:now},{onConflict:'user_id,competency_id'})}toast('Aula concluída e revisões agendadas.');await loadAppData();activeLesson=l;
}

function renderPractice(){header('Practice','Questões, Visual Challenges, cases com IA e Professor Conversation.','PRACTICE CENTRE');const active=lessons.length?'Ativo':'—';contentArea.innerHTML=`<div class="grid cols-4"><div class="card"><div class="metric-label">Quick Questions</div><div class="metric-value">${active}</div><p class="metric-note">Checkpoints objetivos.</p></div><div class="card"><div class="metric-label">Visual Challenges</div><div class="metric-value">${active}</div><p class="metric-note">Documentos, flows e decisões.</p></div><div class="card"><div class="metric-label">AI Cases</div><div class="metric-value">${active}</div><p class="metric-note">Correção técnica + English.</p></div><div class="card"><div class="metric-label">AI Professor</div><div class="metric-value">${active}</div><p class="metric-note">Conversa oral adaptativa em inglês.</p></div></div><div class="section-title"><h3>Practice from published lessons</h3><span>${lessons.length} aulas</span></div><div class="card">${lessons.length?lessons.map((l,i)=>`<div class="lesson-row" data-open-lesson="${l.id}"><div class="lesson-number">${i+1}</div><div><h5>${esc(l.title)}</h5><p>Practice • Visual • Professor • Case • Test</p></div><span class="pill blue">Praticar</span></div>`).join(''):'<div class="empty"><strong>O banco crescerá com as aulas premium.</strong></div>'}</div>`;bindDynamic()}
function renderRevision(){header('Revision','Spaced repetition e recuperação automática de pontos fracos.','REVISION CENTRE');contentArea.innerHTML=`<div class="grid cols-4">${['D+1','D+7','D+30','D+90'].map(s=>{const n=reviews.filter(r=>r.review_stage===s).length;return `<div class="metric-card"><div class="metric-label">${s}</div><div class="metric-value">${n}</div><div class="metric-note">revisões vencidas</div></div>`}).join('')}</div><div class="section-title"><h3>Due reviews</h3><span>${reviews.length} pendentes</span></div><div class="card">${reviews.length?reviews.map(r=>`<div class="review-item"><div class="review-dot"></div><div><strong>${esc(r.lessons?.title||'Competency review')}</strong><span>${esc(r.review_stage)} • devido em ${fmtDate(r.due_date)}</span></div>${r.lessons?.id?`<button class="btn soft" data-open-lesson="${r.lessons.id}">Revisar</button>`:''}</div>`).join(''):'<div class="empty"><strong>Nenhuma revisão vencida.</strong>Após uma aula concluída, o sistema agenda D+1, D+7, D+30 e D+90.</div>'}</div>`;bindDynamic()}
async function renderAssessments(){header('Assessments','Weekly tests, monthly challenges e futuros mock assessments.','ASSESSMENT CENTRE');const {data:ch}=await supabase.from('monthly_challenges').select('*').eq('course_id',course.id).eq('is_published',true).order('month_number');contentArea.innerHTML=`<div class="grid cols-2">${(ch||[]).map(x=>`<div class="card"><span class="pill purple">Month ${x.month_number}</span><h3>${esc(x.title)}</h3><p class="metric-note">${esc(x.description||'')}</p><div class="module-meta"><span class="pill">${x.duration_minutes} min</span><span class="pill amber">100 pontos</span></div></div>`).join('')||'<div class="empty"><strong>Avaliações em preparação.</strong></div>'}</div>`}
function renderPerformance(){header('Performance','Competency map, evidências e gaps abaixo de 70%.','PERFORMANCE');const grouped=Object.groupBy?Object.groupBy(competencies,c=>c.category):competencies.reduce((a,c)=>((a[c.category]??=[]).push(c),a),{});contentArea.innerHTML=`<div class="grid cols-2">${Object.entries(grouped).map(([cat,cs])=>`<div class="card"><div class="section-title" style="margin:0 0 14px"><h3>${esc(cat)}</h3><span>${cs.length} competências</span></div><div class="competency-list">${cs.map(competencyRow).join('')}</div></div>`).join('')}</div>`}
function bindDynamic(){$$('[data-open-lesson]').forEach(b=>b.addEventListener('click',()=>openLesson(b.dataset.openLesson)));$$('[data-go]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.go)))}

window.addEventListener('beforeunload',()=>{try{tutor.stream?.getTracks().forEach(t=>t.stop())}catch{}});
init();
