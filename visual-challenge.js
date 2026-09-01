import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabase=createClient('https://qwvsrcgsfoguxdbcdrxq.supabase.co','sb_publishable_k1VAFbFj5ARYfOOUYhQacQ_wSruDD_Z');
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let lastTitle='';

function prettyValue(value){
  if(value===null||value===undefined)return '';
  if(Array.isArray(value))return value.map(x=>`<li>${esc(x)}</li>`).join('');
  if(typeof value==='object')return Object.entries(value).map(([k,v])=>`<div class="visual-answer-row"><strong>${esc(k.replaceAll('_',' '))}</strong><span>${esc(Array.isArray(v)?v.join(' → '):v)}</span></div>`).join('');
  return esc(value);
}

async function ensureVisualTab(){
  const tabs=document.querySelector('.lesson-tabs');
  const title=document.querySelector('.lesson-banner h3')?.textContent?.trim();
  if(!tabs||!title)return;
  if(title===lastTitle&&tabs.querySelector('[data-visual-tab]'))return;
  lastTitle=title;
  tabs.querySelector('[data-visual-tab]')?.remove();
  const {data:lesson}=await supabase.from('lessons').select('id').eq('title',title).maybeSingle();
  if(!lesson)return;
  const {data:visuals}=await supabase.from('visual_challenges').select('*').eq('lesson_id',lesson.id).order('sequence');
  if(!visuals?.length)return;
  const btn=document.createElement('button');
  btn.className='lesson-tab';
  btn.dataset.visualTab='1';
  btn.textContent='🖼 Visual';
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.lesson-tab').forEach(x=>x.classList.toggle('active',x===btn));
    const pane=document.querySelector('#lessonPane');
    if(!pane)return;
    pane.innerHTML=`<div class="lesson-content"><h4>Visual Challenge</h4><p>Use o cenário visual para raciocinar antes de abrir a resposta.</p>${visuals.map((v,i)=>`<div class="visual-challenge-card"><div class="visual-challenge-head"><span class="pill purple">Challenge ${i+1}</span><span class="pill">${esc(v.asset_type)}</span></div><h4>${esc(v.title)}</h4><p>${esc(v.instructions_pt)}</p><div class="visual-placeholder">${renderVisual(v)}</div><details class="visual-solution"><summary>Ver resposta e explicação</summary><div class="visual-answer">${prettyValue(v.answer_key)}</div><p>${esc(v.explanation_pt||'')}</p></details></div>`).join('')}</div>`;
  });
  const caseTab=tabs.querySelector('[data-ltab="case"]');
  if(caseTab)tabs.insertBefore(btn,caseTab);else tabs.appendChild(btn);
}

function renderVisual(v){
  const a=v.answer_key||{};
  if(v.asset_type==='timeline')return '<div class="timeline-visual"><span>Reporting date</span><b>→</b><span>Event</span><b>→</b><span>Authorisation</span></div>';
  if(v.asset_type==='flow')return '<div class="flow-visual"><span>Input</span><b>→</b><span>Calculation</span><b>→</b><span>Review</span><b>→</b><span>Output</span></div>';
  if(v.asset_type==='calculation')return '<div class="calc-visual"><div><strong>Before</strong><span>Old rate / result</span></div><div>→</div><div><strong>After</strong><span>New rate / result</span></div></div>';
  return '<div class="diagram-visual"><div>Source / facts</div><b>→</b><div>Rule / judgement</div><b>→</b><div>Accounting / payroll output</div></div>';
}

const obs=new MutationObserver(()=>ensureVisualTab());
obs.observe(document.body,{subtree:true,childList:true});
ensureVisualTab();
