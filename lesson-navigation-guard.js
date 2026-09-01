(()=>{
  let pendingLessonId=null;
  let pendingUntil=0;
  let reopenAttempts=0;
  let reopenTimer=null;

  function clearPending(){
    pendingLessonId=null;
    pendingUntil=0;
    reopenAttempts=0;
    if(reopenTimer){clearTimeout(reopenTimer);reopenTimer=null;}
  }

  function lessonIsOpen(){
    return Boolean(document.querySelector('[data-ltab]') || document.querySelector('.lesson-tabs') || document.querySelector('.lesson-content'));
  }

  function scheduleRecovery(){
    if(!pendingLessonId || Date.now()>pendingUntil || reopenAttempts>=3){
      if(Date.now()>pendingUntil)clearPending();
      return;
    }
    if(lessonIsOpen()){
      clearPending();
      return;
    }
    const target=document.querySelector(`[data-open-lesson="${CSS.escape(pendingLessonId)}"]`);
    if(!target)return;
    if(reopenTimer)return;
    reopenTimer=setTimeout(()=>{
      reopenTimer=null;
      if(!pendingLessonId || Date.now()>pendingUntil || lessonIsOpen())return;
      const current=document.querySelector(`[data-open-lesson="${CSS.escape(pendingLessonId)}"]`);
      if(!current)return;
      reopenAttempts+=1;
      current.click();
    },180);
  }

  document.addEventListener('click',event=>{
    const lesson=event.target.closest?.('[data-open-lesson]');
    if(lesson && event.isTrusted){
      pendingLessonId=lesson.dataset.openLesson||null;
      pendingUntil=Date.now()+12000;
      reopenAttempts=0;
      scheduleRecovery();
      return;
    }
    const nav=event.target.closest?.('.nav-item[data-view], [data-go]');
    if(nav && event.isTrusted)clearPending();
  },true);

  const observer=new MutationObserver(()=>scheduleRecovery());
  const start=()=>{
    const content=document.querySelector('#contentArea');
    if(content)observer.observe(content,{childList:true,subtree:true});
    else setTimeout(start,100);
  };
  start();
})();
