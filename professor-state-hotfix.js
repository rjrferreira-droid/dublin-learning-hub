function normalizeProfessorIdleState(){
  const status=document.querySelector('#professorStatus');
  const start=document.querySelector('#startProfessor');
  const end=document.querySelector('#endProfessor');
  if(!status||!start)return;

  const startVisible=!start.classList.contains('hidden');
  const endHidden=!end||end.classList.contains('hidden');
  const trulyIdle=startVisible&&!start.disabled&&endHidden;

  if(trulyIdle){
    status.innerHTML='<strong>Pronto para começar.</strong><p>Ao iniciar, o navegador pedirá acesso ao microfone.</p>';
    const stage=document.querySelector('#professorStage');
    stage?.classList.remove('live','error');
    stage?.classList.add('idle');
  }
}

function scheduleProfessorIdleNormalization(){
  setTimeout(normalizeProfessorIdleState,0);
  setTimeout(normalizeProfessorIdleState,120);
  setTimeout(normalizeProfessorIdleState,500);
}

document.addEventListener('click',event=>{
  const tab=event.target.closest?.('[data-ltab="professor"]');
  if(tab)scheduleProfessorIdleNormalization();
});

const professorStateObserver=new MutationObserver(()=>normalizeProfessorIdleState());
professorStateObserver.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','disabled']});
normalizeProfessorIdleState();
