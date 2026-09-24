import {useEffect,useRef,useState} from 'react';
import {englishSpeakingPhrasesFor} from '../learning/englishSpeakingPhrases';
import {assessEnglishActivity,type EnglishActivityResult} from '../services/englishActivityAssessment';
import {EnglishActivityFeedback} from './EnglishActivityFeedback';

export function SpeakingRepeatPractice({lessonId,active,results,onResult}:{lessonId:string;active:boolean;results:Record<string,EnglishActivityResult>;onResult:(result:EnglishActivityResult)=>void}){
 const phrases=englishSpeakingPhrasesFor(lessonId);
 const [activeIndex,setActiveIndex]=useState<number|null>(null);
 const [requesting,setRequesting]=useState<number|null>(null);
 const [attempts,setAttempts]=useState<Record<number,number>>({});
 const [recordings,setRecordings]=useState<Record<number,string>>({});
 const [error,setError]=useState('');
 const [assessing,setAssessing]=useState<number|null>(null);
 const captured=useRef<Record<number,{blob:Blob;id:string}>>({});
 const evaluating=useRef(false),mounted=useRef(true),requestInFlight=useRef(false);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;if(timer.current)clearTimeout(timer.current);};},[]);
 const recorder=useRef<MediaRecorder|null>(null);
 const stream=useRef<MediaStream|null>(null);
 const urls=useRef(new Set<string>());
 const recordingsRef=useRef(recordings);recordingsRef.current=recordings;
 const activeRef=useRef(active);activeRef.current=active;
 useEffect(()=>()=>{
  if(recorder.current?.state==='recording')recorder.current.onstop=null;
  if(recorder.current?.state==='recording')recorder.current.stop();
  stream.current?.getTracks().forEach(track=>track.stop());
  urls.current.forEach(url=>URL.revokeObjectURL(url));
  globalThis.speechSynthesis?.cancel();
 },[]);
 useEffect(()=>{if(!active){stop();globalThis.speechSynthesis?.cancel();}},[active]);
 if(!phrases.length)return null;

 function listen(text:string){
  if(!('speechSynthesis' in globalThis)){setError('This browser cannot play the example phrase.');return;}
  speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(text);utterance.lang='en-GB';utterance.rate=.88;
  speechSynthesis.speak(utterance);
 }
 async function start(index:number){
  if(!activeRef.current||recorder.current||requestInFlight.current||evaluating.current)return;
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){setError('Microphone recording is unavailable in this browser.');return;}
  setError('');setRequesting(index);requestInFlight.current=true;globalThis.speechSynthesis?.cancel();
  try{
   const input=await navigator.mediaDevices.getUserMedia({audio:true});
   if(!activeRef.current||!mounted.current){input.getTracks().forEach(track=>track.stop());return;}
   const preferred=['audio/webm;codecs=opus','audio/mp4'].find(type=>MediaRecorder.isTypeSupported(type));
   const capture=new MediaRecorder(input,preferred?{mimeType:preferred}:undefined),chunks:BlobPart[]=[];
   stream.current=input;recorder.current=capture;
   capture.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
   capture.onstop=()=>{
    input.getTracks().forEach(track=>track.stop());stream.current=null;recorder.current=null;setActiveIndex(null);
    if(!chunks.length){setError('The recording was empty. Try again.');return;}
    const blob=new Blob(chunks,{type:capture.mimeType});
    captured.current[index]={blob,id:crypto.randomUUID()};
    const url=URL.createObjectURL(blob);
    const old=recordingsRef.current[index];if(old){URL.revokeObjectURL(old);urls.current.delete(old);}
    urls.current.add(url);setRecordings(current=>({...current,[index]:url}));
    setAttempts(current=>({...current,[index]:(current[index]??0)+1}));
   };
   capture.start();setActiveIndex(index);timer.current=setTimeout(stop,29000);
  }catch{setError('Microphone access was not granted. Check browser permissions and try again.');}
  finally{requestInFlight.current=false;if(mounted.current)setRequesting(null);}
 }
 function stop(){if(timer.current)clearTimeout(timer.current);if(recorder.current?.state==='recording')recorder.current.stop();}
 const evaluated=phrases.filter((_,index)=>results[`speaking:${index}`]?.skills.pronunciation.score!=null).length;
 const scores=phrases.flatMap((_,index)=>{const score=results[`speaking:${index}`]?.skills.pronunciation.score;return score==null?[]:[score];});
 async function evaluate(index:number){
  const recording=captured.current[index];if(!recording||evaluating.current)return;
  evaluating.current=true;setAssessing(index);setError('');
  try{const result=await assessEnglishActivity(lessonId,'speaking',String(index),recording.id,recording.blob);if(mounted.current)onResult(result);}
  catch(cause){if(mounted.current)setError(cause instanceof Error?cause.message:'Pronunciation evaluation could not finish.');}
  finally{evaluating.current=false;if(mounted.current)setAssessing(null);}
 }

 return <section className="speaking-repeat" aria-label="Pronunciation repetition">
  <div className="lesson-section-kicker">SPEAKING · 20 PHRASES</div><h2>Listen, repeat and improve</h2>
  <p>Listen to each phrase, record your repetition and send it for pronunciation feedback. Each recording can last up to 29 seconds. The example voice varies by device.</p>
  <p role="status">{evaluated}/{phrases.length} phrases evaluated{scores.length?` · pronunciation ${Math.round(scores.reduce((sum,score)=>sum+score,0)/scores.length)}%`:''}</p>
  {error?<p role="alert">{error}</p>:null}
  <div className="speaking-repeat-list">{phrases.map((phrase,index)=><article className="deep-speaking-task" key={`${index}-${phrase.text}`}>
   <div className="deep-card-heading"><span>PHRASE {index+1} / {phrases.length}</span><strong>{phrase.focus}</strong></div>
   <h3>{phrase.text}</h3>
   <div className="lesson-inline-actions"><button type="button" disabled={!active||activeIndex!==null||requesting!==null} onClick={()=>listen(phrase.text)}>Listen</button><button type="button" disabled={!active||assessing!==null||requesting!==null||(activeIndex!==null&&activeIndex!==index)} onClick={activeIndex===index?stop:()=>void start(index)}>{requesting===index?'Waiting for microphone…':activeIndex===index?'Stop recording':recordings[index]?'Record again':'Record repetition'}</button></div>
   {recordings[index]?<audio controls src={recordings[index]} aria-label={`Your repetition of phrase ${index+1}`}/>:null}
   {recordings[index]?<button type="button" disabled={!active||assessing!==null||activeIndex!==null||results[`speaking:${index}`]?.attempt_id===captured.current[index]?.id} onClick={()=>void evaluate(index)}>{assessing===index?'Analysing pronunciation…':'Send for pronunciation analysis'}</button>:null}
   {results[`speaking:${index}`]?<EnglishActivityFeedback result={results[`speaking:${index}`]}/>:null}
   {attempts[index]?<small>{attempts[index]} attempt{attempts[index]===1?'':'s'} recorded. Compare the model and your playback.</small>:null}
  </article>)}</div>
  <p className="lesson-study-note">Feedback evaluates pronunciation only. Recordings stay in this open lesson; saved feedback is available for 30 days.</p>
 </section>;
}
