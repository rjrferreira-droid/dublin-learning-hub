import {useEffect, useRef, useState} from 'react';
import type {LessonModule} from '../learning/lessonModules';
import './browser-lesson-reader.css';

// Short utterances avoid handing an entire lesson to a device speech engine.
export function speechChunks(text:string):string[] {
 const words=text.trim().split(/\s+/).filter(Boolean);
 const chunks:string[]=[];
 for(const word of words){
  const last=chunks.length-1;
  if(last<0||chunks[last].length+word.length+1>220)chunks.push(word);
  else chunks[last]+=' '+word;
 }
 return chunks;
}

export function BrowserLessonReader({module,disabled=false}:{module:LessonModule;disabled?:boolean}){
 const supported=typeof window!=='undefined'&&'speechSynthesis' in window&&'SpeechSynthesisUtterance' in window;
 const [section,setSection]=useState(0);
 const [language,setLanguage]=useState('en-GB');
 const [rate,setRate]=useState('1');
 const [status,setStatus]=useState('Choose a section, then listen.');
 const [playing,setPlaying]=useState(false);
 const current=useRef<SpeechSynthesisUtterance|null>(null);
 const generation=useRef(0);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 function cancel(){
  generation.current++;
  if(timer.current)clearTimeout(timer.current);
  timer.current=null;
  if(current.current){current.current.onend=null;current.current.onerror=null;current.current.onstart=null;window.speechSynthesis.cancel();}
  current.current=null;
 }
 function stop(){cancel();setPlaying(false);setStatus('Stopped. Listen again to restart this section.');}
 useEffect(()=>{
  const leave=()=>{if(document.hidden)stop();};
  const media=()=>{if(current.current)stop();};
  document.addEventListener('visibilitychange',leave);
  document.addEventListener('play',media,true);
  window.addEventListener('pagehide',media);
  return ()=>{cancel();document.removeEventListener('visibilitychange',leave);document.removeEventListener('play',media,true);window.removeEventListener('pagehide',media);};
 },[]);
 useEffect(()=>{if(disabled)stop();},[disabled]);
 function start(){
  if(!supported||disabled||document.hidden)return;
  cancel();
  document.querySelectorAll('audio').forEach(audio=>audio.pause());
  const selected=module.sections[section];
  const chunks=speechChunks(language==='pt-BR'?selected.supportPt:[selected.title,...selected.paragraphs].join(' '));
  if(!chunks.length){setStatus('No text is available for this section.');return;}
  const token=generation.current;
  const voices=window.speechSynthesis.getVoices().filter(v=>v.lang.toLowerCase().startsWith(language.slice(0,2)));
  const voice=voices.find(v=>v.localService&&v.lang===language)??voices.find(v=>v.localService)??voices.find(v=>v.lang===language)??voices[0];
  function fail(){if(token!==generation.current)return;cancel();setPlaying(false);setStatus('This browser could not read the section. Try another browser or continue reading below.');}
  function speak(index:number){
   if(token!==generation.current)return;
   if(index>=chunks.length){current.current=null;setPlaying(false);setStatus('Section finished. Choose the next section when ready.');return;}
   const utterance=new SpeechSynthesisUtterance(chunks[index]);
   current.current=utterance;
   utterance.lang=language;utterance.rate=Number(rate);if(voice)utterance.voice=voice;
   utterance.onstart=()=>{if(token!==generation.current)return;if(timer.current)clearTimeout(timer.current);timer.current=null;setStatus('Reading section '+(section+1)+' of '+module.sections.length+'.');};
   utterance.onend=()=>{if(timer.current)clearTimeout(timer.current);timer.current=null;speak(index+1);};
   utterance.onerror=fail;
   timer.current=setTimeout(fail,10000);
   try{window.speechSynthesis.speak(utterance);}catch{fail();}
  }
  setPlaying(true);setStatus('Starting browser voice…');speak(0);
 }
 return <section className="browser-lesson-reader" aria-label="Browser lesson reader" data-testid="browser-lesson-reader">
  <h3>Listen with your browser</h3>
  <p>Read the written lesson aloud, or listen to its Portuguese summaries. No OpenAI generation or Learning Hub AI charge. Voice quality and internet requirements depend on your browser and device.</p>
  {!supported?<p role="status">Read-aloud is unavailable in this browser. The written lesson remains available.</p>:<>
   <div className="browser-reader-options">
    <label>Section<select aria-label="Section" value={section} disabled={disabled} onChange={e=>{stop();setSection(Number(e.target.value));}}>{module.sections.map((s,i)=><option key={s.id} value={i}>{s.title}</option>)}</select></label>
    <label>Read aloud<select aria-label="Read aloud" value={language} disabled={disabled} onChange={e=>{stop();setLanguage(e.target.value);}}><option value="en-GB">English lesson</option><option value="pt-BR">Resumo em português</option></select></label>
    <label>Speed<select aria-label="Speed" value={rate} disabled={disabled} onChange={e=>{stop();setRate(e.target.value);}}><option value="0.85">Slower</option><option value="1">Normal</option><option value="1.15">Faster</option></select></label>
   </div>
   <div className="browser-reader-actions"><button type="button" className="secondary-btn" disabled={disabled||playing} onClick={start}>Listen to section</button><button type="button" className="secondary-btn" disabled={!playing} onClick={stop}>Stop reading</button></div>
   <p role="status" aria-live="polite">{disabled?'End the Professor session and use the matching learner account to listen.':status}</p>
   <small>Playback stops when you switch tabs or leave the page. Listening does not create an assessment or save progress.</small>
  </>}
 </section>;
}
