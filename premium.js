import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL='https://qwvsrcgsfoguxdbcdrxq.supabase.co';
const SUPABASE_KEY='sb_publishable_k1VAFbFj5ARYfOOUYhQacQ_wSruDD_Z';
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmtDate=d=>new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(d));
const todayISO=()=>new Date().toISOString().slice(0,10);
const addDays=(n)=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};

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

const authScreen=$('#authScreen');
const appShell=$('#appShell');
const contentArea=$('#contentArea');
const authMessage=$('#authMessage');

function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}
function setAuthMessage(msg,ok=false){authMessage.textContent=msg;authMessage.classList.toggle('success',ok)}
function trackLabel(t){return t==='rafael_finance'?'Global Finance • ACCA • Ireland':'Irish Payroll • HR Operations'}
function initials(name){return String(name||'DL').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()}
function scoreColor(v){return v<70?'red':v<80?'amber':'green'}
function avg(arr){return arr.length?Math.round(arr.reduce((a,b)=>a+b,0)/arr.length):0}
function moduleIcon(cat){const map={global_core:'Σ',corporate:'↗',ireland:'☘',leadership:'◎',career:'◈',ireland_payroll:'€',operations:'⇄',controls:'✓',systems:'⌘'};return map[cat]||'◆'}

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
  const email=$('#email').value.trim();const password=$('#password').value;
  $('#authSubmit').disabled=true;
  try{
    if(authMode==='signin'){
      const {error}=await supabase.auth.signInWithPassword({email,password});
      if(error)throw error;
    }else{
      const display_name=$('#displayName').value.trim()||'Learner';
      const learner_track=$('#learnerTrack').value;
      const {data,error}=await supabase.auth.signUp({email,password,options:{data:{display_name,learner_track}}});
      if(error)throw error;
      if(!data.session){setAuthMessage('Conta criada. Confirme o e-mail enviado pelo Supabase e depois entre aqui.',true);return;}
    }
  }catch(err){setAuthMessage(err.message||'Não foi possível autenticar.');}
  finally{$('#authSubmit').disabled=false;}
});

$('#logoutBtn').addEventListener('click',()=>supabase.auth.signOut());
$('#refreshBtn').addEventListener('click',async()=>{await loadAppData();renderCurrent();toast('Dados atualizados.');});
$$('.nav-item[data-view]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.view)));

supabase.auth.onAuthStateChange(async(_event,newSession)=>{
  session=newSession;
  if(session){authScreen.classList.add('hidden');appShell.classList.remove('hidden');await loadAppData();navigate('dashboard');}
  else{appShell.classList.add('hidden');authScreen.classList.remove('hidden');}
});

async function init(){
  $('#todayLabel').textContent=new Intl.DateTimeFormat('pt-BR',{weekday:'short',day:'2-digit',month:'short'}).format(new Date());
  const {data:{session:s}}=await supabase.auth.getSession();session=s;
  if(session){authScreen.classList.add('hidden');appShell.classList.remove('hidden');await loadAppData();navigate('dashboard');}
}

async function loadAppData(){
  if(!session)return;
  contentArea.innerHTML='<div class="grid cols-3"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>';
  const uid=session.user.id;
  const {data:p,error:pe}=await supabase.from('profiles').select('*').eq('id',uid).maybeSingle();
  if(pe)console.error(pe);
  if(!p){
    const metadata=session.user.user_metadata||{};
    const fallback={id:uid,display_name:metadata.display_name||session.user.email.split('@')[0],learner_track:metadata.learner_track||'rafael_finance'};
    await supabase.from('profiles').insert(fallback);
    profile=fallback;
  }else profile=p;
  const {data:c}=await supabase.from('courses').select('*').eq('learner_track',profile.learner_track).eq('is_active',true).maybeSingle();course=c;
  if(!course)return;
  const [mRes,compRes,progRes,revRes]=await Promise.all([
    supabase.from('modules').select('*').eq('course_id',course.id).eq('is_published',true).order('sequence'),
    supabase.from('competencies').select('*').eq('learner_track',profile.learner_track).order('category').order('name'),
    supabase.from('user_lesson_progress').select('*').eq('user_id',uid),
    supabase.from('spaced_reviews').select('*,lessons(title,slug)').eq('user_id',uid).lte('due_date',todayISO()).in('status',['scheduled','due']).order('due_date')
  ]);
  modules=mRes.data||[];competencies=compRes.data||[];progress=progRes.data||[];reviews=revRes.data||[];
  if(modules.length){const {data:l}=await supabase.from('lessons').select('*').in('module_id',modules.map(x=>x.id)).eq('is_published',true).order('week_number').order('day_number');lessons=l||[];}else lessons=[];
  const {data:scores}=await supabase.from('user_competency_scores').select('*').eq('user_id',uid);
  competencies=competencies.map(c=>({...c,userScore:(scores||[]).find(s=>s.competency_id===c.id)?.score||0,evidence:(scores||[]).find(s=>s.competency_id===c.id)?.evidence_count||0}));
  $('#profileName').textContent=profile.display_name;$('#profileTrack').textContent=trackLabel(profile.learner_track);$('#avatar').textContent=initials(profile.display_name);
}

function navigate(view){
  currentView=view;activeLesson=null;activeLessonData=null;
  $$('.nav-item[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  renderCurrent();
}

function header(title,subtitle,eyebrow='LEARNING HUB'){$('#pageTitle').textContent=title;$('#pageSubtitle').textContent=subtitle;$('#pageEyebrow').textContent=eyebrow;}
function renderCurrent(){
  if(activeLesson)return renderLesson();
  if(currentView==='dashboard')return renderDashboard();
  if(currentView==='study')return renderStudy();
  if(currentView==='practice')return renderPractice();
  if(currentView==='revision')return renderRevision();
  if(currentView==='assessments')return renderAssessments();
  if(currentView==='performance')return renderPerformance();
}

function readinessData(){
  const completed=progress.filter(p=>p.status==='completed').length;
  const courseProgress=lessons.length?Math.round(completed/lessons.length*100):0;
  const assessed=competencies.filter(c=>c.evidence>0);
  const competencyAvg=avg(assessed.map(c=>Number(c.userScore)));
  if(profile.learner_track==='rafael_finance'){
    const global=avg(assessed.filter(c=>['IFRS','FM','PM','CTRL','TREAS','LEAD','SAP','ENG'].includes(c.code)).map(c=>Number(c.userScore)));
    const ireland=avg(assessed.filter(c=>['IRE','GOV','TAX'].includes(c.code)).map(c=>Number(c.userScore)));
    return [{label:'ACCA / Global Finance',value:global},{label:'Corporate Readiness',value:competencyAvg},{label:'Ireland Readiness',value:ireland},{label:'Course progress',value:courseProgress}];
  }
  const payroll=avg(assessed.filter(c=>['G2N','PAYE','USC','PRSI','LIFE'].includes(c.code)).map(c=>Number(c.userScore)));
  const ops=avg(assessed.filter(c=>['RECON','CTRL','SYS'].includes(c.code)).map(c=>Number(c.userScore)));
  const eng=avg(assessed.filter(c=>c.code==='ENG').map(c=>Number(c.userScore)));
  return [{label:'Irish Payroll',value:payroll},{label:'Payroll Operations',value:ops},{label:'Professional English',value:eng},{label:'Course progress',value:courseProgress}];
}

function metricCard(m){const has=m.value>0;return `<div class="metric-card"><div class="metric-top"><div><div class="metric-label">${esc(m.label)}</div><div class="metric-value">${has?m.value+'%':'—'}</div></div><div class="ring" style="--p:${m.value}"></div></div><div class="progress-bar ${scoreColor(m.value)}"><div style="width:${m.value}%"></div></div><div class="metric-note">${has?(m.value<70?'Prioridade de desenvolvimento':m.value<80?'Em consolidação':'Bom domínio'):'Será calculado após suas primeiras avaliações'}</div></div>`}

function nextLesson(){return lessons.find(l=>!progress.find(p=>p.lesson_id===l.id&&p.status==='completed'))||lessons[0]||null}

function renderDashboard(){
  header(`Olá, ${profile.display_name.split(' ')[0]}.`,`Seu estudo de hoje, revisões e evolução de competências.`,'TODAY');
  const next=nextLesson();const metrics=readinessData();
  const weak=competencies.filter(c=>c.evidence>0&&c.userScore<70).sort((a,b)=>a.userScore-b.userScore).slice(0,5);
  contentArea.innerHTML=`
    <div class="card hero">
      <div class="eyebrow">CONTINUE STUDYING</div>
      <h3>${next?esc(next.title):'Sua trilha premium está pronta'}</h3>
      <p class="muted">${next?`${next.estimated_minutes} min • Semana ${next.week_number} • Dia ${next.day_number}`:'As primeiras aulas técnicas aparecerão aqui assim que publicadas.'}</p>
      <div class="hero-actions">${next?`<button class="btn primary" data-open-lesson="${next.id}">Continuar aula</button>`:''}<button class="btn ghost" data-go="revision">Ver revisões (${reviews.length})</button></div>
    </div>
    <div class="section-title"><h3>Readiness</h3><span>baseado em evidências de avaliação</span></div>
    <div class="grid cols-4">${metrics.map(metricCard).join('')}</div>
    <div class="grid cols-2">
      <div>
        <div class="section-title"><h3>Due today</h3><span>D+1 / D+7 / D+30 / D+90</span></div>
        <div class="card">${reviews.length?reviews.slice(0,6).map(r=>`<div class="review-item"><div class="review-dot"></div><div><strong>${esc(r.lessons?.title||'Revisão de competência')}</strong><span>${esc(r.review_stage)} • ${fmtDate(r.due_date)}</span></div><span>${r.review_stage}</span></div>`).join(''):'<div class="empty"><strong>Nenhuma revisão vencida.</strong>O sistema criará revisões automaticamente após as primeiras aulas.</div>'}</div>
      </div>
      <div>
        <div class="section-title"><h3>Needs attention</h3><span>score &lt; 70%</span></div>
        <div class="card">${weak.length?`<div class="competency-list">${weak.map(c=>competencyRow(c)).join('')}</div>`:'<div class="empty"><strong>Ainda sem gaps identificados.</strong>Complete avaliações para gerar seu mapa de fraquezas.</div>'}</div>
      </div>
    </div>`;
  bindDynamic();
}

function competencyRow(c){const v=Math.round(c.userScore||0);return `<div class="competency-row"><div><h5>${esc(c.name)}</h5><div class="progress-bar ${scoreColor(v)}"><div style="width:${v}%"></div></div></div><div class="score">${c.evidence?v+'%':'—'}</div></div>`}

function renderStudy(){
  header('Study','Conteúdo estruturado por módulos, com global core e Ireland overlay.','STRUCTURED LEARNING');
  contentArea.innerHTML=`<div class="grid cols-2">${modules.map(m=>{
    const ls=lessons.filter(l=>l.module_id===m.id);const done=ls.filter(l=>progress.find(p=>p.lesson_id===l.id&&p.status==='completed')).length;
    return `<div class="card module-card" data-module="${m.id}"><div class="module-icon">${moduleIcon(m.category)}</div><div><h4>${esc(m.title)}</h4><p>${esc(m.description)}</p><div class="module-meta"><span class="pill blue">${m.global_core_weight}% Global/Core</span><span class="pill green">${m.ireland_overlay_weight}% Ireland</span><span class="pill">${done}/${ls.length} aulas</span></div></div><span class="pill">Abrir →</span></div>`}).join('')}</div><div id="moduleLessons"></div>`;
  $$('[data-module]').forEach(el=>el.addEventListener('click',()=>renderModule(el.dataset.module)));
}

function renderModule(id){const m=modules.find(x=>x.id===id);const ls=lessons.filter(l=>l.module_id===id);const target=$('#moduleLessons');
  target.innerHTML=`<div class="section-title"><h3>${esc(m.title)}</h3><span>${ls.length} aulas publicadas</span></div><div class="card">${ls.length?ls.map((l,i)=>{const p=progress.find(x=>x.lesson_id===l.id);return `<div class="lesson-row" data-open-lesson="${l.id}"><div class="lesson-number">${p?.status==='completed'?'✓':String(i+1).padStart(2,'0')}</div><div><h5>${esc(l.title)}</h5><p>Semana ${l.week_number} • Dia ${l.day_number} • ${l.estimated_minutes} min • ${esc(l.level)}</p></div><span class="pill ${p?.status==='completed'?'green':'blue'}">${p?.status==='completed'?'Concluída':'Estudar'}</span></div>`}).join(''):'<div class="empty"><strong>Conteúdo em preparação.</strong>Este módulo está estruturado e receberá novas aulas progressivamente.</div>'}</div>`;
  bindDynamic();target.scrollIntoView({behavior:'smooth',block:'start'});
}

async function openLesson(id){activeLesson=lessons.find(l=>l.id===id);if(!activeLesson)return;contentArea.innerHTML='<div class="skeleton"></div>';
  const [src,terms,qs,cases,visuals,audios]=await Promise.all([
    supabase.from('lesson_sources').select('*').eq('lesson_id',id).order('sequence'),
    supabase.from('lesson_terms').select('*').eq('lesson_id',id).order('sequence'),
    supabase.from('questions').select('*').eq('lesson_id',id).eq('is_published',true).order('section').order('sequence'),
    supabase.from('cases').select('*').eq('lesson_id',id).order('sequence'),
    supabase.from('visual_challenges').select('*').eq('lesson_id',id).order('sequence'),
    supabase.from('audio_assets').select('*').eq('lesson_id',id)
  ]);
  activeLessonData={sources:src.data||[],terms:terms.data||[],questions:qs.data||[],cases:cases.data||[],visuals:visuals.data||[],audios:audios.data||[]};
  await markStarted(id);renderLesson();
}

async function markStarted(id){const uid=session.user.id;const old=progress.find(p=>p.lesson_id===id);if(old)return;await supabase.from('user_lesson_progress').upsert({user_id:uid,lesson_id:id,status:'in_progress',started_at:new Date().toISOString(),last_activity_at:new Date().toISOString()},{onConflict:'user_id,lesson_id'});}

function renderLesson(){const l=activeLesson;const d=activeLessonData;if(!l||!d)return;
  header(l.title,`Semana ${l.week_number} • Dia ${l.day_number} • ${l.estimated_minutes} min`,'PREMIUM LESSON');
  contentArea.innerHTML=`<div class="lesson-shell"><div class="lesson-banner"><div class="breadcrumb">${esc(course.title)} / Semana ${l.week_number}</div><h3>${esc(l.title)}</h3><p>${esc(l.subtitle||'Technical lesson • practical application • assessment')}</p></div>
  <div class="lesson-tabs"><button class="lesson-tab active" data-ltab="notes">📖 Notes</button><button class="lesson-tab" data-ltab="audio">🎧 Audio</button><button class="lesson-tab" data-ltab="english">🇬🇧 English</button><button class="lesson-tab" data-ltab="practice">🧠 Practice</button><button class="lesson-tab" data-ltab="case">💼 Case</button><button class="lesson-tab" data-ltab="test">✅ Test</button><button class="lesson-tab" data-ltab="sources">📚 Sources</button></div><div id="lessonPane"></div></div>`;
  $$('.lesson-tab').forEach(b=>b.addEventListener('click',()=>{ $$('.lesson-tab').forEach(x=>x.classList.toggle('active',x===b));renderLessonPane(b.dataset.ltab);}));renderLessonPane('notes');
}

function paragraphize(text){if(!text)return '<p class="muted">Conteúdo em preparação.</p>';return String(text).split(/\n{2,}/).map(p=>`<p>${esc(p).replace(/\n/g,'<br>')}</p>`).join('')}
function renderLessonPane(tab){const l=activeLesson,d=activeLessonData,pane=$('#lessonPane');
  if(tab==='notes')pane.innerHTML=`<div class="lesson-content">${(l.learning_objectives||[]).length?`<div class="objective-box"><strong>Ao final desta aula você deve conseguir:</strong><ul>${l.learning_objectives.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}<h4>Technical Brief</h4>${paragraphize(l.technical_brief_pt)}${l.global_core_pt?`<h4>ACCA / Global Core</h4>${paragraphize(l.global_core_pt)}`:''}${l.ireland_overlay_pt?`<h4>Ireland Overlay</h4>${paragraphize(l.ireland_overlay_pt)}`:''}${l.worked_example_pt?`<h4>Worked Example</h4><div class="callout blue">${paragraphize(l.worked_example_pt)}</div>`:''}${l.common_mistakes_pt?`<h4>Common mistakes & risks</h4><div class="callout amber">${paragraphize(l.common_mistakes_pt)}</div>`:''}${l.interview_angle_pt?`<h4>Interview / Manager angle</h4><div class="callout green">${paragraphize(l.interview_angle_pt)}</div>`:''}<div class="hero-actions"><button class="btn primary" data-next-tab="practice">Knowledge check →</button></div></div>`;
  if(tab==='audio'){const text=l.manager_commentary_pt||l.technical_brief_pt;pane.innerHTML=`<div class="lesson-content"><h4>Professor Commentary</h4><p>Este áudio complementa a leitura e enfatiza aplicação profissional. A versão atual usa a voz do dispositivo como fallback.</p><div class="callout blue">${paragraphize(l.manager_commentary_pt||'O commentary premium desta aula está sendo preparado.')}</div><button class="btn primary" id="playAudio">▶ Ouvir commentary</button><button class="btn" id="stopAudio">■ Parar</button></div>`;$('#playAudio')?.addEventListener('click',()=>speak(text));$('#stopAudio')?.addEventListener('click',()=>speechSynthesis.cancel());}
  if(tab==='english')pane.innerHTML=`<div class="lesson-content"><h4>English Toolkit</h4><p>Vocabulário técnico aplicado à aula, com definição e frase profissional.</p><div class="term-grid">${d.terms.length?d.terms.map(t=>`<div class="term-card"><h5>${esc(t.term_en)}</h5><div class="translation">${esc(t.translation_pt)}</div><p>${esc(t.definition_en)}</p><p><em>${esc(t.example_en)}</em></p><button class="speak" data-speak="${esc(t.term_en)}">🔊 Ouvir</button></div>`).join(''):'<div class="empty"><strong>Toolkit em preparação.</strong></div>'}</div></div>`;
  if(tab==='practice')pane.innerHTML=questionSection('checkpoint','Knowledge Check','Perguntas curtas para validar a leitura antes do caso.');
  if(tab==='case')pane.innerHTML=caseSection();
  if(tab==='test')pane.innerHTML=questionSection('final_test','Final Test','Questões técnicas e de aplicação. O resultado alimenta seu competency map.');
  if(tab==='sources')pane.innerHTML=`<div class="lesson-content"><h4>Official & Technical Sources</h4><p>Conteúdo revisado em: <strong>${l.source_last_reviewed?fmtDate(l.source_last_reviewed):'a definir'}</strong></p>${d.sources.length?d.sources.map(s=>`<div class="source-item"><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)} ↗</a><span>${esc(s.publisher||'')} • ${esc(s.source_type||'source')}${s.note?' • '+esc(s.note):''}</span></div>`).join(''):'<div class="empty"><strong>Fontes em preparação.</strong></div>'}</div>`;
  $$('[data-next-tab]').forEach(b=>b.addEventListener('click',()=>{$(`[data-ltab="${b.dataset.nextTab}"]`)?.click()}));
  $$('[data-speak]').forEach(b=>b.addEventListener('click',()=>speak(b.dataset.speak)));
  $$('.grade-quiz').forEach(b=>b.addEventListener('click',()=>gradeQuiz(b.dataset.section)));
  $('#saveCase')?.addEventListener('click',saveCase);
}

function speak(text){if(!('speechSynthesis'in window)){toast('Áudio não suportado neste navegador.');return}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='pt-BR';u.rate=.95;speechSynthesis.speak(u)}
function questionSection(section,title,intro){const qs=activeLessonData.questions.filter(q=>q.section===section);return `<div class="lesson-content"><h4>${title}</h4><p>${intro}</p>${qs.length?qs.map((q,i)=>questionHTML(q,i)).join(''):'<div class="empty"><strong>Banco de questões em preparação.</strong>As questões desta aula serão publicadas junto com o conteúdo técnico.</div>'}${qs.length?`<button class="btn primary grade-quiz" data-section="${section}">Corrigir ${section==='final_test'?'teste':'checkpoint'}</button><div id="quizResult-${section}"></div>`:''}</div>`}
function questionHTML(q,i){if(q.question_type==='mcq'||q.question_type==='visual_mcq'){const opts=Array.isArray(q.options)?q.options:(q.options?.options||[]);return `<div class="question-card" data-qid="${q.id}"><h5>${i+1}. ${esc(q.prompt_pt)}</h5>${opts.map((o,j)=>`<label class="option"><input type="radio" name="q-${q.id}" value="${j}"> ${esc(typeof o==='string'?o:(o.text||o.label||String(o)))}</label>`).join('')}</div>`}if(q.question_type==='true_false')return `<div class="question-card" data-qid="${q.id}"><h5>${i+1}. ${esc(q.prompt_pt)}</h5><label class="option"><input type="radio" name="q-${q.id}" value="true"> Verdadeiro</label><label class="option"><input type="radio" name="q-${q.id}" value="false"> Falso</label></div>`;return `<div class="question-card" data-qid="${q.id}"><h5>${i+1}. ${esc(q.prompt_pt)}</h5><textarea rows="4" data-answer="${q.id}" placeholder="Sua resposta..."></textarea></div>`}

function getCorrectIndex(q){const a=q.correct_answer;if(typeof a==='number')return String(a);if(typeof a==='string')return a;if(a&&typeof a==='object'){if(a.index!==undefined)return String(a.index);if(a.value!==undefined)return String(a.value);if(a.answer!==undefined)return String(a.answer)}return null}
async function gradeQuiz(section){const qs=activeLessonData.questions.filter(q=>q.section===section);let correct=0,answered=0;const attempts=[];for(const q of qs){let answer=null,isCorrect=null;if(['mcq','visual_mcq','true_false'].includes(q.question_type)){answer=document.querySelector(`input[name="q-${q.id}"]:checked`)?.value??null;if(answer!==null){answered++;isCorrect=String(answer)===String(getCorrectIndex(q));if(isCorrect)correct++;}}else{answer=document.querySelector(`[data-answer="${q.id}"]`)?.value?.trim()||null;if(answer){answered++;isCorrect=null;}}
    if(answer!==null)attempts.push({user_id:session.user.id,question_id:q.id,answer:{value:answer},is_correct:isCorrect,score:isCorrect===true?q.points:isCorrect===false?0:null});}
  if(answered<qs.length){toast('Responda todas as questões antes de corrigir.');return}
  if(attempts.length)await supabase.from('question_attempts').insert(attempts);
  const sc=Math.round(correct/qs.filter(q=>['mcq','visual_mcq','true_false'].includes(q.question_type)).length*100)||0;
  const box=$(`#quizResult-${section}`);box.innerHTML=`<div class="result-box"><strong>Resultado: ${sc}%</strong><p>${sc>=80?'Bom domínio.':sc>=70?'Aprovado, mas vale revisar os pontos de dúvida.':'Gap identificado: esta competência voltará em revisão espaçada.'}</p></div>`;
  if(section==='final_test')await completeLesson(sc);
}

function caseSection(){const c=activeLessonData.cases[0];if(!c)return '<div class="lesson-content"><div class="empty"><strong>Case em preparação.</strong></div></div>';return `<div class="lesson-content"><h4>${esc(c.title)}</h4><div class="callout blue">${paragraphize(c.scenario_pt)}</div><p><strong>Sua tarefa</strong></p>${paragraphize(c.prompt_pt)}<textarea id="caseAnswer" rows="9" placeholder="Estruture sua resposta como faria em uma situação profissional..."></textarea><div class="hero-actions"><button class="btn primary" id="saveCase" data-case="${c.id}">Salvar resposta</button>${c.model_answer_pt?'<button class="btn soft" id="showModel">Ver modelo de resposta</button>':''}</div><div id="caseFeedback"></div></div>`}
async function saveCase(){const c=activeLessonData.cases[0];const response=$('#caseAnswer').value.trim();if(!response){toast('Escreva sua resposta primeiro.');return}await supabase.from('case_submissions').insert({user_id:session.user.id,case_id:c.id,response_text:response});$('#caseFeedback').innerHTML=`<div class="result-box"><strong>Resposta salva.</strong><p>Ela já faz parte do seu histórico. A correção por IA será ativada quando conectarmos a API; enquanto isso, o modelo/rubrica pode ser usado para comparação.</p>${c.model_answer_pt?`<details><summary>Modelo de resposta</summary>${paragraphize(c.model_answer_pt)}</details>`:''}</div>`;toast('Case salvo.');}

async function completeLesson(score){const uid=session.user.id,l=activeLesson;const now=new Date().toISOString();const old=progress.find(p=>p.lesson_id===l.id);const best=Math.max(Number(old?.best_score||0),score);await supabase.from('user_lesson_progress').upsert({user_id:uid,lesson_id:l.id,status:'completed',started_at:old?.started_at||now,completed_at:now,best_score:best,latest_score:score,attempts:Number(old?.attempts||0)+1,last_activity_at:now},{onConflict:'user_id,lesson_id'});
  const existing=await supabase.from('spaced_reviews').select('id').eq('user_id',uid).eq('lesson_id',l.id).limit(1);if(!(existing.data||[]).length){await supabase.from('spaced_reviews').insert([{user_id:uid,lesson_id:l.id,review_stage:'D+1',due_date:addDays(1),status:'scheduled'},{user_id:uid,lesson_id:l.id,review_stage:'D+7',due_date:addDays(7),status:'scheduled'},{user_id:uid,lesson_id:l.id,review_stage:'D+30',due_date:addDays(30),status:'scheduled'},{user_id:uid,lesson_id:l.id,review_stage:'D+90',due_date:addDays(90),status:'scheduled'}]);}
  const comps=await supabase.from('lesson_competencies').select('competency_id,weight').eq('lesson_id',l.id);for(const lc of comps.data||[]){const prev=competencies.find(c=>c.id===lc.competency_id);const oldScore=Number(prev?.userScore||0);const evidence=Number(prev?.evidence||0);const newScore=evidence?Math.round((oldScore*evidence+score)/(evidence+1)):score;await supabase.from('user_competency_scores').upsert({user_id:uid,competency_id:lc.competency_id,score:newScore,confidence:Math.min(100,(evidence+1)*20),evidence_count:evidence+1,last_assessed_at:now},{onConflict:'user_id,competency_id'});}
  toast('Aula concluída e revisões agendadas.');await loadAppData();activeLesson=l;}

function renderPractice(){header('Practice','Banco de questões, cálculos, cenários e visual challenges.','PRACTICE CENTRE');const published=lessons.length;contentArea.innerHTML=`<div class="grid cols-3"><div class="card"><div class="metric-label">Quick Questions</div><div class="metric-value">${published?'Ativo':'—'}</div><p class="metric-note">Checkpoints e questões objetivas vinculadas às aulas.</p></div><div class="card"><div class="metric-label">Manager / Payroll Cases</div><div class="metric-value">${published?'Ativo':'—'}</div><p class="metric-note">Situações abertas com rubrica e histórico de resposta.</p></div><div class="card"><div class="metric-label">Visual Challenges</div><div class="metric-value">${published?'Em breve':'—'}</div><p class="metric-note">P&L, payslip, reconciliations, dashboards e documentos.</p></div></div><div class="section-title"><h3>Practice from published lessons</h3><span>${lessons.length} aulas</span></div><div class="card">${lessons.length?lessons.map((l,i)=>`<div class="lesson-row" data-open-lesson="${l.id}"><div class="lesson-number">${i+1}</div><div><h5>${esc(l.title)}</h5><p>Abrir aula e ir para Practice / Case / Test</p></div><span class="pill blue">Praticar</span></div>`).join(''):'<div class="empty"><strong>O banco de practice crescerá com as aulas premium.</strong></div>'}</div>`;bindDynamic();}
function renderRevision(){header('Revision','Spaced repetition e recuperação automática de pontos fracos.','REVISION CENTRE');contentArea.innerHTML=`<div class="grid cols-3">${['D+1','D+7','D+30'].map(s=>{const n=reviews.filter(r=>r.review_stage===s).length;return `<div class="metric-card"><div class="metric-label">${s}</div><div class="metric-value">${n}</div><div class="metric-note">revisões vencidas</div></div>`}).join('')}</div><div class="section-title"><h3>Due reviews</h3><span>${reviews.length} pendentes</span></div><div class="card">${reviews.length?reviews.map(r=>`<div class="review-item"><div class="review-dot"></div><div><strong>${esc(r.lessons?.title||'Competency review')}</strong><span>${esc(r.review_stage)} • devido em ${fmtDate(r.due_date)}</span></div><button class="btn soft">Revisar</button></div>`).join(''):'<div class="empty"><strong>Nenhuma revisão vencida.</strong>Após uma aula concluída, o sistema agenda D+1, D+7, D+30 e D+90.</div>'}</div>`}
async function renderAssessments(){header('Assessments','Weekly tests, monthly challenges e futuros mock assessments.','ASSESSMENT CENTRE');const {data:ch}=await supabase.from('monthly_challenges').select('*').eq('course_id',course.id).eq('is_published',true).order('month_number');contentArea.innerHTML=`<div class="grid cols-2">${(ch||[]).map(x=>`<div class="card"><span class="pill purple">Month ${x.month_number}</span><h3>${esc(x.title)}</h3><p class="metric-note">${esc(x.description||'')}</p><div class="module-meta"><span class="pill">${x.duration_minutes} min</span><span class="pill amber">100 pontos</span></div><div class="hero-actions"><button class="btn primary">Abrir challenge</button></div></div>`).join('')||'<div class="empty"><strong>Avaliações em preparação.</strong></div>'}</div>`}
function renderPerformance(){header('Performance','Competency map, evidências e gaps abaixo de 70%.','PERFORMANCE');const grouped=Object.groupBy?Object.groupBy(competencies,c=>c.category):competencies.reduce((a,c)=>((a[c.category]??=[]).push(c),a),{});contentArea.innerHTML=`<div class="grid cols-2">${Object.entries(grouped).map(([cat,cs])=>`<div class="card"><div class="section-title" style="margin:0 0 14px"><h3>${esc(cat)}</h3><span>${cs.length} competências</span></div><div class="competency-list">${cs.map(competencyRow).join('')}</div></div>`).join('')}</div>`}

function bindDynamic(){
  $$('[data-open-lesson]').forEach(b=>b.addEventListener('click',()=>openLesson(b.dataset.openLesson)));
  $$('[data-go]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.go)));
}

init();
