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
const paragraphize=text=>!text?'<p class="muted">Conteúdo em preparação.</p>':String(text).split(/\n{2,}/).map(p=>`<p>${esc(p).replace(/\n/g,'<br>')}</p>`).join('');

let authMode='signin';
let session=null;
let profile=null;
let course=null;
let modules=[];
let lessons=[];
let progress=[];
let reviews=[];
let competencies=[];
let currentView='dashboard';
let activeLesson=null;
let activeLessonData=null;
let currentLessonTab='notes';
let booting=false;

const authScreen=$('#authScreen');
const appShell=$('#appShell');
const contentArea=$('#contentArea');
const authMessage=$('#authMessage');

function toast(msg){const t=$('#toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}
function setAuthMessage(msg,ok=false){authMessage.textContent=msg;authMessage.classList.toggle('success',ok)}
function trackLabel(t){return t==='rafael_finance'?'Global Finance • ACCA • Ireland':'Irish Payroll • HR Operations'}
function initials(name){return String(name||'DL').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()}
function scoreColor(v){return v<70?'red':v<80?'amber':'green'}
function avg(arr){return arr.length?Math.round(arr.reduce((a,b)=>a+b,0)/arr.length):0}
function moduleIcon(cat){const map={global_core:'Σ',corporate:'↗',ireland:'☘',leadership:'◎',career:'◈',ireland_payroll:'€',operations:'⇄',controls:'✓',systems:'⌘'};return map[cat]||'◆'}
function header(title,subtitle,eyebrow='LEARNING HUB'){$('#pageTitle').textContent=title;$('#pageSubtitle').textContent=subtitle;$('#pageEyebrow').textContent=eyebrow}

async function loadAppData(){
  if(!session)return;
  const uid=session.user.id;
  const {data:p}=await supabase.from('profiles').select('*').eq('id',uid).maybeSingle();
  if(!p){
    const md=session.user.user_metadata||{};
    const fallback={id:uid,display_name:md.display_name||session.user.email.split('@')[0],learner_track:md.learner_track||'rafael_finance'};
    await supabase.from('profiles').insert(fallback);
    profile=fallback;
  }else profile=p;

  const {data:c}=await supabase.from('courses').select('*').eq('learner_track',profile.learner_track).eq('is_active',true).maybeSingle();
  course=c;
  if(!course){modules=[];lessons=[];progress=[];reviews=[];competencies=[];return;}

  const [mRes,compRes,progRes,revRes]=await Promise.all([
    supabase.from('modules').select('*').eq('course_id',course.id).eq('is_published',true).order('sequence'),
    supabase.from('competencies').select('*').eq('learner_track',profile.learner_track).order('category').order('name'),
    supabase.from('user_lesson_progress').select('*').eq('user_id',uid),
    supabase.from('spaced_reviews').select('*,lessons(id,title,slug)').eq('user_id',uid).lte('due_date',todayISO()).in('status',['scheduled','due']).order('due_date')
  ]);
  modules=mRes.data||[];
  progress=progRes.data||[];
  reviews=revRes.data||[];

  if(modules.length){
    const {data:l}=await supabase.from('lessons').select('*').in('module_id',modules.map(x=>x.id)).eq('is_published',true).order('week_number').order('day_number');
    lessons=l||[];
  }else lessons=[];

  const {data:scores}=await supabase.from('user_competency_scores').select('*').eq('user_id',uid);
  competencies=(compRes.data||[]).map(c=>({
    ...c,
    userScore:Number((scores||[]).find(s=>s.competency_id===c.id)?.score||0),
    evidence:Number((scores||[]).find(s=>s.competency_id===c.id)?.evidence_count||0)
  }));

  $('#profileName').textContent=profile.display_name;
  $('#profileTrack').textContent=trackLabel(profile.learner_track);
  $('#avatar').textContent=initials(profile.display_name);
}

async function enterApp(newSession,{goDashboard=true}={}){
  if(booting)return;
  booting=true;
  try{
    session=newSession;
    authScreen.classList.add('hidden');
    appShell.classList.remove('hidden');
    contentArea.innerHTML='<div class="grid cols-3"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>';
    await loadAppData();
    if(goDashboard){currentView='dashboard';activeLesson=null;activeLessonData=null;currentLessonTab='notes';}
    renderCurrent();
  }finally{booting=false;}
}

function showAuth(){
  session=null;profile=null;course=null;modules=[];lessons=[];progress=[];reviews=[];competencies=[];activeLesson=null;activeLessonData=null;
  appShell.classList.add('hidden');authScreen.classList.remove('hidden');
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
      const {data,error}=await supabase.auth.signInWithPassword({email,password});
      if(error)throw error;
      if(data.session)await enterApp(data.session);
    }else{
      const display_name=$('#displayName').value.trim()||'Learner',learner_track=$('#learnerTrack').value;
      const {data,error}=await supabase.auth.signUp({email,password,options:{data:{display_name,learner_track}}});
      if(error)throw error;
      if(data.session)await enterApp(data.session);else setAuthMessage('Conta criada. Confirme o e-mail e depois entre aqui.',true);
    }
  }catch(err){setAuthMessage(err.message||'Não foi possível autenticar.')}finally{$('#authSubmit').disabled=false}
});

$('#logoutBtn').addEventListener('click',async()=>{await supabase.auth.signOut();showAuth()});
$('#refreshBtn').addEventListener('click',async()=>{await loadAppData();renderCurrent();toast('Dados atualizados.')});
$$('.nav-item[data-view]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.view)));

// Important: background auth maintenance must NEVER change the current page.
supabase.auth.onAuthStateChange((event,newSession)=>{
  if(event==='TOKEN_REFRESHED'&&newSession){session=newSession;return;}
  if(event==='SIGNED_OUT'){showAuth();return;}
  if(event==='SIGNED_IN'&&newSession&&!session){void enterApp(newSession);}
});

async function init(){
  $('#todayLabel').textContent=new Intl.DateTimeFormat('pt-BR',{weekday:'short',day:'2-digit',month:'short'}).format(new Date());
  const {data:{session:s}}=await supabase.auth.getSession();
  if(s)await enterApp(s);else showAuth();
}

function setNavActive(view){$$('.nav-item[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view))}
function navigate(view){currentView=view;activeLesson=null;activeLessonData=null;currentLessonTab='notes';setNavActive(view);renderCurrent()}
function renderCurrent(){if(activeLesson)return renderLesson();if(currentView==='dashboard')return renderDashboard();if(currentView==='study')return renderStudy();if(currentView==='practice')return renderPractice();if(currentView==='revision')return renderRevision();if(currentView==='assessments')return renderAssessments();if(currentView==='performance')return renderPerformance();renderDashboard()}

function nextLesson(){return lessons.find(l=>!progress.find(p=>p.lesson_id===l.id&&p.status==='completed'))||lessons[0]||null}
function readinessData(){
  const assessed=competencies.filter(c=>c.evidence>0),completed=progress.filter(p=>p.status==='completed').length,courseProgress=lessons.length?Math.round(completed/lessons.length*100):0,overall=avg(assessed.map(c=>c.userScore));
  if(profile?.learner_track==='rafael_finance'){
    const global=avg(assessed.filter(c=>['IFRS','FM','PM','CTRL','TREAS','LEAD','SAP','ENG'].includes(c.code)).map(c=>c.userScore));
    const ireland=avg(assessed.filter(c=>['IRE','GOV','TAX'].includes(c.code)).map(c=>c.userScore));
    return [{label:'ACCA / Global Finance',value:global},{label:'Corporate Readiness',value:overall},{label:'Ireland Readiness',value:ireland},{label:'Course progress',value:courseProgress}];
  }
  const payroll=avg(assessed.filter(c=>['G2N','PAYE','USC','PRSI','LIFE'].includes(c.code)).map(c=>c.userScore)),ops=avg(assessed.filter(c=>['RECON','CTRL','SYS'].includes(c.code)).map(c=>c.userScore)),eng=avg(assessed.filter(c=>c.code==='ENG').map(c=>c.userScore));
  return [{label:'Irish Payroll',value:payroll},{label:'Payroll Operations',value:ops},{label:'Professional English',value:eng},{label:'Course progress',value:courseProgress}];
}
function metricCard(m){const has=m.value>0;return `<div class="metric-card"><div class="metric-top"><div><div class="metric-label">${esc(m.label)}</div><div class="metric-value">${has?m.value+'%':'—'}</div></div><div class="ring" style="--p:${m.value}"></div></div><div class="progress-bar ${scoreColor(m.value)}"><div style="width:${m.value}%"></div></div><div class="metric-note">${has?(m.value<70?'Prioridade de desenvolvimento':m.value<80?'Em consolidação':'Bom domínio'):'Será calculado após suas primeiras avaliações'}</div></div>`}
function competencyRow(c){const v=Math.round(c.userScore||0);return `<div class="competency-row"><div><h5>${esc(c.name)}</h5><div class="progress-bar ${scoreColor(v)}"><div style="width:${v}%"></div></div></div><div class="score">${c.evidence?v+'%':'—'}</div></div>`}

function renderDashboard(){
  header(`Olá, ${profile?.display_name?.split(' ')[0]||'Learner'}.`,'Seu estudo de hoje, revisões e evolução de competências.','TODAY');setNavActive('dashboard');
  const next=nextLesson(),metrics=readinessData(),weak=competencies.filter(c=>c.evidence>0&&c.userScore<70).sort((a,b)=>a.userScore-b.userScore).slice(0,5);
  contentArea.innerHTML=`<div class="card hero"><div class="eyebrow">CONTINUE STUDYING</div><h3>${next?esc(next.title):'Sua trilha está pronta'}</h3><p class="muted">${next?`${next.estimated_minutes} min • Semana ${next.week_number} • Dia ${next.day_number}`:'Novas aulas aparecerão aqui conforme forem publicadas.'}</p><div class="hero-actions">${next?`<button class="btn primary" data-open-lesson="${next.id}">Continuar aula</button>`:''}<button class="btn ghost" data-go="study">Ver aulas</button></div></div>
  <div class="section-title"><h3>Readiness</h3><span>baseado em evidências de avaliação</span></div><div class="grid cols-4">${metrics.map(metricCard).join('')}</div>
  <div class="grid cols-2"><div><div class="section-title"><h3>Due today</h3><span>D+1 / D+7 / D+30 / D+90</span></div><div class="card">${reviews.length?reviews.slice(0,6).map(r=>`<div class="review-item"><div class="review-dot"></div><div><strong>${esc(r.lessons?.title||'Revisão')}</strong><span>${esc(r.review_stage)} • ${fmtDate(r.due_date)}</span></div>${r.lessons?.id?`<button class="btn soft" data-open-lesson="${r.lessons.id}">Revisar</button>`:''}</div>`).join(''):'<div class="empty"><strong>Nenhuma revisão vencida.</strong>As revisões serão agendadas após os testes finais.</div>'}</div></div>
  <div><div class="section-title"><h3>Needs attention</h3><span>score &lt; 70%</span></div><div class="card">${weak.length?`<div class="competency-list">${weak.map(competencyRow).join('')}</div>`:'<div class="empty"><strong>Ainda sem gaps identificados.</strong>Complete avaliações para gerar seu mapa de fraquezas.</div>'}</div></div></div>`;
}

function renderStudy(){
  header('Study','Conteúdo estruturado por módulos, com Global Core e Ireland Overlay.','STRUCTURED LEARNING');setNavActive('study');
  contentArea.innerHTML=`<div class="grid cols-2">${modules.map(m=>{const ls=lessons.filter(l=>l.module_id===m.id),done=ls.filter(l=>progress.find(p=>p.lesson_id===l.id&&p.status==='completed')).length;return `<div class="card module-card" data-module="${m.id}"><div class="module-icon">${moduleIcon(m.category)}</div><div><h4>${esc(m.title)}</h4><p>${esc(m.description||'')}</p><div class="module-meta"><span class="pill blue">${m.global_core_weight}% Global/Core</span><span class="pill green">${m.ireland_overlay_weight}% Ireland</span><span class="pill">${done}/${ls.length} aulas</span></div></div><span class="pill">Abrir →</span></div>`}).join('')}</div><div id="moduleLessons"></div>`;
}
function renderModule(id){
  const m=modules.find(x=>x.id===id),ls=lessons.filter(l=>l.module_id===id),target=$('#moduleLessons');if(!m||!target)return;
  target.innerHTML=`<div class="section-title"><h3>${esc(m.title)}</h3><span>${ls.length} aulas publicadas</span></div><div class="card">${ls.length?ls.map((l,i)=>{const p=progress.find(x=>x.lesson_id===l.id);return `<div class="lesson-row" data-open-lesson="${l.id}"><div class="lesson-number">${p?.status==='completed'?'✓':String(i+1).padStart(2,'0')}</div><div><h5>${esc(l.title)}</h5><p>Semana ${l.week_number} • Dia ${l.day_number} • ${l.estimated_minutes} min • ${esc(l.level||'')}</p></div><span class="pill ${p?.status==='completed'?'green':'blue'}">${p?.status==='completed'?'Concluída':'Estudar'}</span></div>`}).join(''):'<div class="empty"><strong>Conteúdo em preparação.</strong></div>'}</div>`;
  target.scrollIntoView({behavior:'smooth',block:'start'});
}

async function openLesson(id){
  const lesson=lessons.find(l=>l.id===id);if(!lesson){toast('Aula não encontrada.');return;}
  activeLesson=lesson;activeLessonData=null;currentLessonTab='notes';currentView='study';setNavActive('study');
  header(lesson.title,`Semana ${lesson.week_number} • Dia ${lesson.day_number} • ${lesson.estimated_minutes} min`,'PREMIUM LESSON');
  contentArea.innerHTML='<div class="skeleton" style="height:240px"></div>';
  const [src,terms,qs,cases,visuals,audios]=await Promise.all([
    supabase.from('lesson_sources').select('*').eq('lesson_id',id).order('sequence'),
    supabase.from('lesson_terms').select('*').eq('lesson_id',id).order('sequence'),
    supabase.from('questions').select('*').eq('lesson_id',id).eq('is_published',true).order('section').order('sequence'),
    supabase.from('cases').select('*').eq('lesson_id',id).order('sequence'),
    supabase.from('visual_challenges').select('*').eq('lesson_id',id).order('sequence'),
    supabase.from('audio_assets').select('*').eq('lesson_id',id)
  ]);
  if(activeLesson?.id!==id)return;
  activeLessonData={sources:src.data||[],terms:terms.data||[],questions:qs.data||[],cases:cases.data||[],visuals:visuals.data||[],audios:audios.data||[]};
  await markStarted(id);
  renderLesson();
}
async function markStarted(id){
  const old=progress.find(p=>p.lesson_id===id);if(old)return;
  const now=new Date().toISOString();
  await supabase.from('user_lesson_progress').upsert({user_id:session.user.id,lesson_id:id,status:'in_progress',started_at:now,last_activity_at:now},{onConflict:'user_id,lesson_id'});
  progress.push({user_id:session.user.id,lesson_id:id,status:'in_progress',started_at:now,last_activity_at:now});
}

function renderLesson(){
  const l=activeLesson,d=activeLessonData;if(!l||!d)return;
  header(l.title,`Semana ${l.week_number} • Dia ${l.day_number} • ${l.estimated_minutes} min`,'PREMIUM LESSON');setNavActive('study');
  contentArea.innerHTML=`<div class="lesson-shell"><div class="lesson-banner"><div class="breadcrumb">${esc(course?.title||'Dublin Learning Hub')} / Semana ${l.week_number}</div><h3>${esc(l.title)}</h3><p>${esc(l.subtitle||'Technical lesson • practical application • assessment')}</p></div>
  <div class="lesson-tabs"><button class="lesson-tab" data-ltab="notes">📖 Notes</button><button class="lesson-tab" data-ltab="audio">🎧 Audio</button><button class="lesson-tab" data-ltab="english">🇬🇧 English</button><button class="lesson-tab" data-ltab="practice">🧠 Practice</button><button class="lesson-tab" data-ltab="visual">🖼 Visual</button><button class="lesson-tab" data-ltab="case">💼 Case</button><button class="lesson-tab" data-ltab="test">✅ Test</button><button class="lesson-tab" data-ltab="sources">📚 Sources</button></div><div id="lessonPane"></div></div>`;
  $$('.lesson-tab').forEach(b=>b.classList.toggle('active',b.dataset.ltab===currentLessonTab));
  renderLessonPane(currentLessonTab);
}

function renderLessonPane(tab){
  currentLessonTab=tab;const l=activeLesson,d=activeLessonData,pane=$('#lessonPane');if(!pane)return;
  $$('.lesson-tab').forEach(b=>b.classList.toggle('active',b.dataset.ltab===tab));
  if(tab==='notes')pane.innerHTML=`<div class="lesson-content">${Array.isArray(l.learning_objectives)&&l.learning_objectives.length?`<div class="objective-box"><strong>Ao final desta aula você deve conseguir:</strong><ul>${l.learning_objectives.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}<h4>Technical Brief</h4>${paragraphize(l.technical_brief_pt)}${l.global_core_pt?`<h4>ACCA / Global Core</h4>${paragraphize(l.global_core_pt)}`:''}${l.ireland_overlay_pt?`<h4>Ireland Overlay</h4>${paragraphize(l.ireland_overlay_pt)}`:''}${l.worked_example_pt?`<h4>Worked Example</h4><div class="callout blue">${paragraphize(l.worked_example_pt)}</div>`:''}${l.interview_angle_pt?`<h4>Interview / Manager angle</h4><div class="callout green">${paragraphize(l.interview_angle_pt)}</div>`:''}<div class="hero-actions"><button class="btn primary" data-ltab-jump="practice">Knowledge check →</button></div></div>`;
  if(tab==='audio'){
    const cached=d.audios.find(a=>a.public_url||a.url||a.audio_url);
    pane.innerHTML=`<div class="lesson-content"><h4>Audio</h4>${cached?`<audio controls style="width:100%" src="${esc(cached.public_url||cached.url||cached.audio_url)}"></audio>`:'<div class="callout blue"><strong>Modo estável ativo.</strong><p>O áudio premium e o Professor por voz estão temporariamente desligados enquanto estabilizamos a interface. O conteúdo técnico, inglês, casos e testes continuam disponíveis normalmente.</p></div>'}</div>`;
  }
  if(tab==='english')pane.innerHTML=`<div class="lesson-content"><h4>English Toolkit</h4><p>Vocabulário técnico aplicado à aula, com definição e frase profissional.</p><div class="term-grid">${d.terms.length?d.terms.map(t=>`<div class="term-card"><h5>${esc(t.term_en)}</h5><div class="translation">${esc(t.translation_pt||'')}</div><p>${esc(t.definition_en||'')}</p><p><em>${esc(t.example_en||'')}</em></p><button class="speak" data-speak="${esc(t.term_en)}">🔊 Ouvir</button></div>`).join(''):'<div class="empty"><strong>Toolkit em preparação.</strong></div>'}</div></div>`;
  if(tab==='practice')pane.innerHTML=questionSection('checkpoint','Knowledge Check','Perguntas curtas para validar a leitura antes do caso.');
  if(tab==='visual')pane.innerHTML=`<div class="lesson-content"><h4>Visual Challenge</h4>${d.visuals.length?d.visuals.map(v=>`<div class="question-card"><h5>${esc(v.title)}</h5><p>${esc(v.instructions_pt||'')}</p><details><summary>Ver resposta comentada</summary><div class="callout blue"><p>${esc(v.explanation_pt||'')}</p>${v.answer_key?`<pre style="white-space:pre-wrap">${esc(JSON.stringify(v.answer_key,null,2))}</pre>`:''}</div></details></div>`).join(''):'<div class="empty"><strong>Visual challenge em preparação.</strong></div>'}</div>`;
  if(tab==='case')pane.innerHTML=`<div class="lesson-content"><h4>Manager Case</h4>${d.cases.length?d.cases.map(c=>`<div class="question-card"><h5>${esc(c.title)}</h5><p>${esc(c.scenario_pt||'')}</p><div class="callout blue"><strong>Sua tarefa</strong>${paragraphize(c.prompt_pt)}</div><textarea rows="8" data-case-answer="${c.id}" placeholder="Estruture sua resposta aqui..."></textarea><details style="margin-top:14px"><summary>Ver modelo depois de responder</summary><div class="callout green">${paragraphize(String(c.model_answer_pt||'').replaceAll('$model$',''))}</div></details></div>`).join(''):'<div class="empty"><strong>Caso em preparação.</strong></div>'}</div>`;
  if(tab==='test')pane.innerHTML=questionSection('final_test','Final Test','Cinco questões para concluir a aula e alimentar seu mapa de competências.');
  if(tab==='sources')pane.innerHTML=`<div class="lesson-content"><h4>Official & technical sources</h4>${d.sources.length?d.sources.map(s=>`<div class="source-item"><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title||s.url)}</a><span>${esc([s.publisher,s.note].filter(Boolean).join(' • '))}</span></div>`).join(''):'<div class="empty"><strong>Fontes em preparação.</strong></div>'}</div>`;
}

function questionSection(section,title,intro){const qs=activeLessonData.questions.filter(q=>q.section===section);return `<div class="lesson-content"><h4>${title}</h4><p>${intro}</p>${qs.length?qs.map((q,i)=>questionHTML(q,i)).join(''):'<div class="empty"><strong>Banco de questões em preparação.</strong></div>'}${qs.length?`<button class="btn primary" data-grade="${section}">Corrigir ${section==='final_test'?'teste':'checkpoint'}</button><div id="quizResult-${section}"></div>`:''}</div>`}
function questionHTML(q,i){const opts=Array.isArray(q.options)?q.options:(q.options?.options||[]);if(q.question_type==='mcq'||q.question_type==='visual_mcq')return `<div class="question-card"><h5>${i+1}. ${esc(q.prompt_pt||q.prompt_en||'')}</h5>${opts.map((o,j)=>`<label class="option"><input type="radio" name="q-${q.id}" value="${j}"> ${esc(typeof o==='string'?o:(o.text||o.label||String(o)))}</label>`).join('')}</div>`;if(q.question_type==='true_false')return `<div class="question-card"><h5>${i+1}. ${esc(q.prompt_pt||q.prompt_en||'')}</h5><label class="option"><input type="radio" name="q-${q.id}" value="true"> Verdadeiro</label><label class="option"><input type="radio" name="q-${q.id}" value="false"> Falso</label></div>`;return `<div class="question-card"><h5>${i+1}. ${esc(q.prompt_pt||q.prompt_en||'')}</h5><textarea rows="4" data-answer="${q.id}" placeholder="Sua resposta..."></textarea></div>`}
function getCorrectAnswer(q){const a=q.correct_answer;if(typeof a==='number'||typeof a==='string')return String(a);if(a&&typeof a==='object'){if(a.index!==undefined)return String(a.index);if(a.value!==undefined)return String(a.value);if(a.answer!==undefined)return String(a.answer)}return null}
async function gradeQuiz(section){
  const qs=activeLessonData.questions.filter(q=>q.section===section);let correct=0,gradable=0,answered=0;const detail=[];
  for(const q of qs){if(!['mcq','visual_mcq','true_false'].includes(q.question_type))continue;gradable++;const answer=document.querySelector(`input[name="q-${q.id}"]:checked`)?.value??null;if(answer!==null){answered++;const ok=String(answer)===String(getCorrectAnswer(q));if(ok)correct++;detail.push({q,ok});}}
  const score=gradable?Math.round(correct/gradable*100):0,target=$(`#quizResult-${section}`);
  target.innerHTML=`<div class="result-box"><strong>${score}%</strong> • ${correct}/${gradable} corretas${answered<gradable?` • ${gradable-answered} sem resposta`:''}${detail.filter(x=>!x.ok).length?`<div style="margin-top:10px">${detail.filter(x=>!x.ok).map(x=>`<p><strong>Revisar:</strong> ${esc(x.q.explanation_pt||'Revise o conceito desta questão.')}</p>`).join('')}</div>`:''}</div>`;
  if(section==='final_test')await completeLesson(score);
}
async function completeLesson(score){
  const uid=session.user.id,l=activeLesson,now=new Date().toISOString(),old=progress.find(p=>p.lesson_id===l.id),best=Math.max(Number(old?.best_score||0),score);
  await supabase.from('user_lesson_progress').upsert({user_id:uid,lesson_id:l.id,status:'completed',started_at:old?.started_at||now,completed_at:now,best_score:best,latest_score:score,attempts:Number(old?.attempts||0)+1,last_activity_at:now},{onConflict:'user_id,lesson_id'});
  const existing=await supabase.from('spaced_reviews').select('id').eq('user_id',uid).eq('lesson_id',l.id).limit(1);
  if(!(existing.data||[]).length)await supabase.from('spaced_reviews').insert([
    {user_id:uid,lesson_id:l.id,review_stage:'D+1',due_date:addDays(1),status:'scheduled'},
    {user_id:uid,lesson_id:l.id,review_stage:'D+7',due_date:addDays(7),status:'scheduled'},
    {user_id:uid,lesson_id:l.id,review_stage:'D+30',due_date:addDays(30),status:'scheduled'},
    {user_id:uid,lesson_id:l.id,review_stage:'D+90',due_date:addDays(90),status:'scheduled'}
  ]);
  const {data:comps}=await supabase.from('lesson_competencies').select('competency_id,weight').eq('lesson_id',l.id);
  for(const lc of comps||[]){const prev=competencies.find(c=>c.id===lc.competency_id),oldScore=Number(prev?.userScore||0),evidence=Number(prev?.evidence||0),newScore=evidence?Math.round((oldScore*evidence+score)/(evidence+1)):score;await supabase.from('user_competency_scores').upsert({user_id:uid,competency_id:lc.competency_id,score:newScore,confidence:Math.min(100,(evidence+1)*20),evidence_count:evidence+1,last_assessed_at:now},{onConflict:'user_id,competency_id'});}
  await loadAppData();activeLesson=lessons.find(x=>x.id===l.id)||l;toast('Aula concluída e revisões agendadas.');
}

function renderPractice(){header('Practice','Questões, casos e desafios das aulas publicadas.','PRACTICE CENTRE');setNavActive('practice');contentArea.innerHTML=`<div class="card"><div class="callout blue"><strong>Modo estável.</strong> A prática escrita, os Visual Challenges e os testes estão ativos. A conversa por voz será reativada separadamente depois que a navegação estiver validada.</div>${lessons.map((l,i)=>`<div class="lesson-row" data-open-lesson="${l.id}"><div class="lesson-number">${i+1}</div><div><h5>${esc(l.title)}</h5><p>Practice • Visual • Case • Test</p></div><span class="pill blue">Praticar</span></div>`).join('')}</div>`}
function renderRevision(){header('Revision','Spaced repetition D+1 / D+7 / D+30 / D+90.','REVISION CENTRE');setNavActive('revision');contentArea.innerHTML=`<div class="grid cols-4">${['D+1','D+7','D+30','D+90'].map(s=>`<div class="metric-card"><div class="metric-label">${s}</div><div class="metric-value">${reviews.filter(r=>r.review_stage===s).length}</div><div class="metric-note">revisões vencidas</div></div>`).join('')}</div><div class="section-title"><h3>Due reviews</h3><span>${reviews.length} pendentes</span></div><div class="card">${reviews.length?reviews.map(r=>`<div class="review-item"><div class="review-dot"></div><div><strong>${esc(r.lessons?.title||'Revisão')}</strong><span>${esc(r.review_stage)} • ${fmtDate(r.due_date)}</span></div>${r.lessons?.id?`<button class="btn soft" data-open-lesson="${r.lessons.id}">Revisar</button>`:''}</div>`).join(''):'<div class="empty"><strong>Nenhuma revisão vencida.</strong></div>'}</div>`}
async function renderAssessments(){header('Assessments','Monthly challenges e avaliações publicadas.','ASSESSMENT CENTRE');setNavActive('assessments');const {data:ch}=await supabase.from('monthly_challenges').select('*').eq('course_id',course.id).eq('is_published',true).order('month_number');if(currentView!=='assessments'||activeLesson)return;contentArea.innerHTML=`<div class="grid cols-2">${(ch||[]).map(x=>`<div class="card"><span class="pill purple">Month ${x.month_number}</span><h3>${esc(x.title)}</h3><p class="metric-note">${esc(x.description||'')}</p><div class="module-meta"><span class="pill">${x.duration_minutes} min</span><span class="pill amber">100 pontos</span></div></div>`).join('')||'<div class="empty"><strong>Avaliações em preparação.</strong></div>'}</div>`}
function renderPerformance(){header('Performance','Competency map e gaps abaixo de 70%.','PERFORMANCE');setNavActive('performance');const grouped=competencies.reduce((a,c)=>((a[c.category]??=[]).push(c),a),{});contentArea.innerHTML=`<div class="grid cols-2">${Object.entries(grouped).map(([cat,cs])=>`<div class="card"><div class="section-title" style="margin:0 0 14px"><h3>${esc(cat)}</h3><span>${cs.length} competências</span></div><div class="competency-list">${cs.map(competencyRow).join('')}</div></div>`).join('')}</div>`}

contentArea.addEventListener('click',e=>{
  const open=e.target.closest('[data-open-lesson]');if(open){void openLesson(open.dataset.openLesson);return;}
  const go=e.target.closest('[data-go]');if(go){navigate(go.dataset.go);return;}
  const mod=e.target.closest('[data-module]');if(mod){renderModule(mod.dataset.module);return;}
  const tab=e.target.closest('[data-ltab]');if(tab&&activeLesson){renderLessonPane(tab.dataset.ltab);return;}
  const jump=e.target.closest('[data-ltab-jump]');if(jump&&activeLesson){renderLessonPane(jump.dataset.ltabJump);return;}
  const grade=e.target.closest('[data-grade]');if(grade&&activeLesson){void gradeQuiz(grade.dataset.grade);return;}
  const speak=e.target.closest('[data-speak]');if(speak&&'speechSynthesis'in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(speak.dataset.speak);u.lang='en-IE';speechSynthesis.speak(u);}
});

init();
