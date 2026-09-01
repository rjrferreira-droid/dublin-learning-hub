const state={profile:'rafael',week:0,day:0,tab:'lesson'};
const saved=JSON.parse(localStorage.getItem('dublinHubProgress')||'{}');
const current=()=>DATA[state.profile].weeks[state.week].days[state.day];
const k=()=>`${state.profile}-${state.week}-${state.day}`;
const persist=()=>localStorage.setItem('dublinHubProgress',JSON.stringify(saved));

function completedCount(profile){
  const total=DATA[profile].weeks.reduce((n,w)=>n+w.days.length,0);
  let done=0;
  DATA[profile].weeks.forEach((w,wi)=>w.days.forEach((_,di)=>{if(saved[`${profile}-${wi}-${di}`]?.done)done++;}));
  return [done,total];
}

function makeFiveQuestions(d){
  const pool=['reconciliation','governance','approval','deadline','evidence','variance','Revenue','CRO','PAYE','PRSI','cash forecast','segregation of duties'];
  const vocabCorrect=d.v[0];
  const distract=pool.filter(x=>!d.v.includes(x)).slice(0,2);
  return [
    {q:d.q,opts:d.opts,a:d.a},
    {q:'Qual destes termos faz parte do English toolkit desta aula?',opts:[vocabCorrect,...distract],a:0},
    {q:'Qual é o objetivo principal desta aula?',opts:[d.o,'Memorizar todas as alíquotas atuais','Substituir julgamento profissional por checklist'],a:0},
    {q:'Qual abordagem está mais alinhada ao treinamento?',opts:['Validar dados, documentar evidências e escalar riscos quando necessário','Evitar revisão para ganhar velocidade','Depender apenas da memória'],a:0},
    {q:'Como tratar regras que podem mudar antes de 2028/29?',opts:['Validar a regra vigente quando o tema for revisitado','Usar para sempre os valores aprendidos hoje','Ignorar mudanças futuras'],a:0}
  ];
}

function renderWeeks(){
  const el=document.getElementById('weekList');el.innerHTML='';
  DATA[state.profile].weeks.forEach((w,i)=>{
    const b=document.createElement('button');b.className='week'+(i===state.week?' active':'');
    b.innerHTML=`Semana ${i+1}<small>${w.title}</small>`;
    b.onclick=()=>{state.week=i;state.day=0;state.tab='lesson';render();};el.appendChild(b);
  });
}

function renderDays(){
  const el=document.getElementById('dayNav');el.innerHTML='';
  DATA[state.profile].weeks[state.week].days.forEach((_,i)=>{
    const b=document.createElement('button');
    b.className='day'+(i===state.day?' active':'')+(saved[`${state.profile}-${state.week}-${i}`]?.done?' done':'');
    b.textContent=`Dia ${i+1}`;b.onclick=()=>{state.day=i;state.tab='lesson';render();};el.appendChild(b);
  });
}

function renderLesson(){
  const d=current();
  document.getElementById('lessonView').innerHTML=`
    <div class="objective"><strong>Objetivo:</strong> ${d.o}</div>
    <div class="reading">${d.r.map(p=>`<p>${p}</p>`).join('')}</div>
    <h3>English toolkit</h3><div class="vocab">${d.v.map(x=>`<span class="term">${x}</span>`).join('')}</div>
    <div class="actions"><button class="btn primary" id="doneBtn">${saved[k()]?.done?'Concluída ✓':'Marcar como concluída'}</button><button class="btn" id="nextCase">Ir para o caso prático</button></div>`;
  document.getElementById('doneBtn').onclick=()=>{saved[k()]={...(saved[k()]||{}),done:true};persist();render();};
  document.getElementById('nextCase').onclick=()=>{state.tab='case';renderViews();};
}

function renderCase(){
  const d=current(),prev=saved[k()]?.caseAnswer||'';
  document.getElementById('caseView').innerHTML=`
    <div class="case-box"><strong>Caso prático</strong><p>${d.c}</p></div>
    <h3>Sua resposta</h3><textarea class="answer" id="caseAnswer" placeholder="Responda como faria em uma situação real...">${prev}</textarea>
    <div class="actions"><button class="btn primary" id="saveCase">Salvar resposta</button><button class="btn" id="nextQuiz">Ir para o quiz</button></div>
    <div id="caseSaved" class="notice hidden">Resposta salva neste navegador.</div>`;
  document.getElementById('saveCase').onclick=()=>{saved[k()]={...(saved[k()]||{}),caseAnswer:document.getElementById('caseAnswer').value};persist();document.getElementById('caseSaved').classList.remove('hidden');};
  document.getElementById('nextQuiz').onclick=()=>{state.tab='quiz';renderViews();};
}

function renderQuiz(){
  const qs=makeFiveQuestions(current()),existing=saved[k()]?.quiz||{};
  document.getElementById('quizView').innerHTML=`<h3>Quiz — 5 perguntas</h3>${qs.map((q,qi)=>`
    <div class="quiz-question"><h4>${qi+1}. ${q.q}</h4>${q.opts.map((o,oi)=>`<label class="option"><input type="radio" name="q${qi}" value="${oi}" ${existing.answers?.[qi]===oi?'checked':''}> ${o}</label>`).join('')}</div>`).join('')}
    <div class="actions"><button class="btn primary" id="submitQuiz">Corrigir quiz</button></div><div id="quizResult"></div>`;
  document.getElementById('submitQuiz').onclick=()=>{
    const answers=qs.map((_,i)=>{const e=document.querySelector(`input[name="q${i}"]:checked`);return e?Number(e.value):null;});
    if(answers.some(v=>v===null)){alert('Responda as 5 perguntas antes de corrigir.');return;}
    const score=answers.reduce((s,a,i)=>s+(a===qs[i].a?1:0),0);
    saved[k()]={...(saved[k()]||{}),quiz:{answers,score,total:5}};persist();
    const pct=score*20;document.getElementById('quizResult').innerHTML=`<div class="notice"><strong>${score}/5 — ${pct}%</strong><br>${pct<70?'<span class="warning">Abaixo de 70%: este tema deve voltar em spaced review.</span>':'Bom resultado. O conteúdo continuará aparecendo em revisões espaçadas.'}</div>`;
  };
  if(existing.total){document.getElementById('quizResult').innerHTML=`<div class="notice"><strong>Último resultado: ${existing.score}/5 — ${existing.score*20}%</strong></div>`;}
}

function renderProgress(){
  const [done,total]=completedCount(state.profile);let quizN=0,quizPoints=0,quizMax=0;
  const histories=[];
  Object.entries(saved).forEach(([key,val])=>{
    if(!key.startsWith(state.profile+'-'))return;
    if(val.quiz){quizN++;quizPoints+=val.quiz.score;quizMax+=val.quiz.total;}
    if(val.caseAnswer?.trim())histories.push({key,text:val.caseAnswer});
  });
  const completion=Math.round(done/total*100),accuracy=quizMax?Math.round(quizPoints/quizMax*100):0;
  document.getElementById('progressView').innerHTML=`
    <div class="score-grid"><div class="metric"><span class="muted small">Aulas concluídas</span><strong>${done}/${total}</strong></div><div class="metric"><span class="muted small">Quiz accuracy</span><strong>${accuracy}%</strong></div><div class="metric"><span class="muted small">Mês 1</span><strong>${completion}%</strong></div></div>
    <div class="case-history"><h3>Casos respondidos</h3>${histories.length?histories.map(h=>`<div class="history-item"><div class="small muted">${h.key}</div>${h.text}</div>`).join(''):'<p class="muted">Nenhum caso salvo ainda.</p>'}</div>`;
}

function renderViews(){
  ['lesson','case','quiz','progress'].forEach(name=>document.getElementById(name+'View').classList.toggle('hidden',state.tab!==name));
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===state.tab));
  if(state.tab==='case')renderCase();if(state.tab==='quiz')renderQuiz();if(state.tab==='progress')renderProgress();
}

function render(){
  document.querySelectorAll('.profile').forEach(b=>b.classList.toggle('active',b.dataset.profile===state.profile));
  renderWeeks();renderDays();
  const w=DATA[state.profile].weeks[state.week],d=current();
  document.getElementById('breadcrumb').textContent=`${DATA[state.profile].label} • Semana ${state.week+1} • Dia ${state.day+1}`;
  document.getElementById('lessonTitle').textContent=d.t;document.getElementById('weekFocus').textContent=w.focus;
  const status=document.getElementById('status');status.textContent=saved[k()]?.done?'Concluída ✓':'Não concluída';status.classList.toggle('done',!!saved[k()]?.done);
  const [done,total]=completedCount(state.profile),pct=Math.round(done/total*100);document.getElementById('monthProgress').style.width=pct+'%';document.getElementById('monthProgressText').textContent=`${done} de ${total} aulas concluídas • ${pct}%`;
  renderLesson();renderViews();
}

document.querySelectorAll('.profile').forEach(b=>b.onclick=()=>{state.profile=b.dataset.profile;state.week=0;state.day=0;state.tab='lesson';render();});
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;renderViews();});
render();