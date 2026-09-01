(function(){
  const VIEW_ID='toolkitDedicatedView';
  const TAB_ID='englishToolkitTab';
  function getInfo(term){
    if(typeof toolkitInfo==='function') return toolkitInfo(term);
    return {pt:'termo técnico',def:'Professional English term used in this lesson.',ex:'This term is used in a professional finance or payroll context.'};
  }
  function ensureToolkitView(){
    let view=document.getElementById(VIEW_ID);
    if(!view){
      view=document.createElement('section');
      view.id=VIEW_ID;
      view.className='view hidden';
      const lesson=document.getElementById('lessonView');
      if(lesson) lesson.insertAdjacentElement('afterend',view);
    }
    return view;
  }
  function renderDedicatedToolkit(){
    const view=ensureToolkitView();
    if(!view) return;
    const terms=[...document.querySelectorAll('#lessonView .term')].map(el=>el.textContent.trim()).filter(Boolean);
    if(!terms.length){view.innerHTML='<div class="notice">Abra uma aula para carregar o English Toolkit correspondente.</div>';return;}
    view.innerHTML=`<div class="toolkit-intro"><strong>English Toolkit desta aula</strong><br>Os 5 termos abaixo fazem parte do vocabulário técnico do dia. Use o áudio para praticar a pronúncia e leia o exemplo em voz alta.</div><div class="toolkit-grid">${terms.map(term=>{const info=getInfo(term);return `<article class="toolkit-full-card"><div class="toolkit-full-head"><h4>${term}</h4><button class="speak-btn" type="button" data-speak="${term.replace(/"/g,'&quot;')}">🔊 Ouvir</button></div><div class="toolkit-full-row"><strong>Português</strong>${info.pt}</div><div class="toolkit-full-row"><strong>Meaning</strong>${info.def}</div><div class="toolkit-full-row toolkit-full-example"><strong>Example</strong>${info.ex}</div></article>`;}).join('')}</div><div class="toolkit-open-note">Dica: tente repetir cada exemplo em inglês antes de seguir para o caso prático.</div>`;
  }
  function openDedicatedToolkit(e){
    if(e){e.preventDefault();e.stopImmediatePropagation();}
    renderDedicatedToolkit();
    ['lessonView','caseView','quizView','progressView'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.add('hidden');});
    const view=document.getElementById(VIEW_ID);if(view)view.classList.remove('hidden');
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    const tab=document.getElementById(TAB_ID);if(tab)tab.classList.add('active');
  }
  function closeDedicatedToolkit(){const view=document.getElementById(VIEW_ID);if(view)view.classList.add('hidden');}
  function ensureTab(){
    const tabs=document.querySelector('.tabs');if(!tabs)return;
    let tab=document.getElementById(TAB_ID);
    if(!tab){
      tab=document.createElement('button');tab.id=TAB_ID;tab.type='button';tab.className='tab toolkit-tab';tab.textContent='English Toolkit';
      const caseTab=tabs.querySelector('[data-tab="case"]');if(caseTab)tabs.insertBefore(tab,caseTab);else tabs.appendChild(tab);
      tab.addEventListener('click',openDedicatedToolkit);
    }
    ensureToolkitView();
  }
  function enhanceInlineToolkit(){
    document.querySelectorAll('#lessonView .vocab').forEach(vocab=>{
      if(!vocab.previousElementSibling||!vocab.previousElementSibling.classList.contains('toolkit-hint')){
        const hint=document.createElement('div');hint.className='toolkit-hint';hint.innerHTML='<strong>👆 Toolkit interativo:</strong> clique em um termo abaixo ou abra a aba <strong>English Toolkit</strong> para ver todos de uma vez.';vocab.insertAdjacentElement('beforebegin',hint);
      }
    });
    document.querySelectorAll('.term').forEach(el=>{el.classList.add('term-interactive');el.setAttribute('aria-label','Abrir English toolkit: '+el.textContent.trim());});
  }
  function enhance(){ensureTab();enhanceInlineToolkit();}
  document.addEventListener('click',e=>{if(e.target.closest('#'+TAB_ID))return;if(e.target.closest('.tab,.profile,.week,.day'))closeDedicatedToolkit();},true);
  const obs=new MutationObserver(enhance);obs.observe(document.body,{subtree:true,childList:true});enhance();
})();