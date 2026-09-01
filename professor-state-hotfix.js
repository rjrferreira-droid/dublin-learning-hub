function normalizeProfessorIdleState(){
  const status=document.querySelector('#professorStatus');
  const start=document.querySelector('#startProfessor');
  const end=document.querySelector('#endProfessor');
  if(!status||!start)return;

  const startVisible=!start.classList.contains('hidden');
  const endHidden=!end||end.classList.contains('hidden');
  const text=(status.textContent||'').trim().toLowerCase();

  if(startVisible&&endHidden&&(text.includes('conexão encerrada')||text.includes('connection closed')||text.includes('conexão encerrada.'))){
    status.innerHTML='<strong>Pronto para começar.</strong><p>Ao iniciar, o navegador pedirá acesso ao microfone.</p>';
    const stage=document.querySelector('#professorStage');
    stage?.classList.remove('live','error');
    stage?.classList.add('idle');
  }
}

const professorStateObserver=new MutationObserver(()=>normalizeProfessorIdleState());
professorStateObserver.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});
normalizeProfessorIdleState();
