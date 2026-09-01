(function(){
  function enhance(){
    document.querySelectorAll('#lessonView .vocab').forEach(vocab=>{
      if(!vocab.previousElementSibling || !vocab.previousElementSibling.classList.contains('toolkit-hint')){
        const hint=document.createElement('div');
        hint.className='toolkit-hint';
        hint.innerHTML='<strong>👆 Toolkit interativo:</strong> clique em qualquer termo para ver tradução, significado, exemplo profissional e ouvir a pronúncia.';
        vocab.insertAdjacentElement('beforebegin',hint);
      }
    });
    document.querySelectorAll('.term').forEach(el=>{
      el.classList.add('term-interactive');
      el.setAttribute('aria-label','Abrir English toolkit: '+el.textContent.trim());
    });
  }
  const obs=new MutationObserver(enhance);
  obs.observe(document.body,{subtree:true,childList:true});
  enhance();
})();