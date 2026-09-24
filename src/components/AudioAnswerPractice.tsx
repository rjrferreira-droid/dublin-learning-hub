import {useEffect,useRef,useState} from 'react';
import type {AudioQuestion} from '../learning/audioQuestions';

const MAX_SECONDS=60;
type RecordedAnswer={url:string;seconds:number};

export function AudioAnswerPractice({questions,active,canRecord}:{questions:readonly AudioQuestion[];active:boolean;canRecord:boolean}){
 const [index,setIndex]=useState(0);
 const [questionsStarted,setQuestionsStarted]=useState(false);
 const [recording,setRecording]=useState(false);
 const [elapsed,setElapsed]=useState(0);
 const [answers,setAnswers]=useState<(RecordedAnswer|null)[]>(()=>questions.map(()=>null));
 const [error,setError]=useState<string|null>(null);
 const recorder=useRef<MediaRecorder|null>(null);
 const stream=useRef<MediaStream|null>(null);
 const started=useRef(0);
 const urls=useRef<string[]>([]);
 const mounted=useRef(true);
 const clock=useRef<ReturnType<typeof setInterval>|null>(null);
 const limit=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{
  mounted.current=false;if(recorder.current)recorder.current.onstop=null;
  if(recorder.current?.state==='recording')recorder.current.stop();stream.current?.getTracks().forEach(track=>track.stop());
  if(clock.current)clearInterval(clock.current);if(limit.current)clearTimeout(limit.current);
  urls.current.forEach(url=>URL.revokeObjectURL(url));
 },[]);
 useEffect(()=>{if(!active&&recorder.current?.state==='recording')stop();},[active]);
 if(questions.length===0)return null;
 const done=index>=questions.length;
 const current=answers[index];
 async function start(){
  if(recording||done||!questionsStarted||!canRecord)return;
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){
   setError('This browser cannot record a voice answer. Try a browser with microphone access.');return;
  }
  setError(null);
  try{
   const input=await navigator.mediaDevices.getUserMedia({audio:true});
   if(!mounted.current){input.getTracks().forEach(track=>track.stop());return;}
   const preferred=['audio/webm;codecs=opus','audio/mp4'].find(type=>MediaRecorder.isTypeSupported(type));
   const capture=new MediaRecorder(input,preferred?{mimeType:preferred}:undefined);
   const chunks:BlobPart[]=[];
   stream.current=input;recorder.current=capture;
   capture.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
   capture.onstop=()=>{
    const seconds=Math.min(MAX_SECONDS,Math.max(1,Math.round((Date.now()-started.current)/1000)));
    input.getTracks().forEach(track=>track.stop());stream.current=null;recorder.current=null;
    if(chunks.length){
     const url=URL.createObjectURL(new Blob(chunks,{type:capture.mimeType}));urls.current.push(url);
     setAnswers(previous=>previous.map((answer,answerIndex)=>answerIndex===index?{url,seconds}:answer));
    }else setError('The recording was empty. Please try again.');
    setRecording(false);
   };
   started.current=Date.now();setElapsed(0);capture.start();setRecording(true);
   clock.current=setInterval(()=>setElapsed(Math.min(MAX_SECONDS,Math.floor((Date.now()-started.current)/1000))),250);
   limit.current=setTimeout(()=>stop(),MAX_SECONDS*1000);
  }catch{setError('Microphone access was not granted. Check your browser permission and try again.');}
 }
 function stop(){
  if(clock.current)clearInterval(clock.current);clock.current=null;
  if(limit.current)clearTimeout(limit.current);limit.current=null;
  if(recorder.current?.state==='recording')recorder.current.stop();
 }
 return <section className="audio-answer-practice" aria-label="Listening questions">
  <div className="audio-answer-heading"><h3>Answer in your own words</h3><span>{questions.length} questions · up to 1 min each</span></div>
  {!questionsStarted?<div className="audio-answer-ready">
   <div><strong>{canRecord?'Ready for your answers':'Ready when you finish listening'}</strong><p>Answer five questions in English, one at a time. You can replay the episode or open the transcript before starting.</p></div>
   <button type="button" disabled={!canRecord} onClick={()=>setQuestionsStarted(true)}>Start questions →</button>
   {!canRecord?<small>The questions open after the audio plays through. Your microphone is inactive until then.</small>:null}
  </div>:!done?<>
   <p>After listening, answer each question in English. Your recordings stay in this open lesson.</p>
   <div className="audio-answer-card"><div className="audio-answer-top"><strong>QUESTION {index+1} OF {questions.length}</strong><span>{recording?`${MAX_SECONDS-elapsed}s left`:'Up to 1:00'}</span></div>
    <h4>{questions[index].question}</h4>
    <div className="audio-record-actions"><button type="button" disabled={!canRecord} onClick={recording?stop:()=>void start()}>{recording?'Stop recording':current?'Record again':'Record answer'}</button>
     {current&&!recording?<audio controls src={current.url} aria-label={`Your answer to question ${index+1}`}/>:null}</div>
    {error?<p role="alert">{error}</p>:null}
    {current&&!recording?<div className="audio-answer-next"><span>Recorded · {current.seconds}s</span><button type="button" onClick={()=>setIndex(value=>value+1)}>{index===questions.length-1?'Review answers':'Next question →'}</button></div>:null}
   </div>
  </>:<div className="audio-answer-review"><h4>Five answers recorded</h4><p>Listen to your responses and compare the key facts. Automatic feedback and a percentage require the separate voice assessment service; no score is inferred from these recordings.</p>
   <details><summary>Review questions and reference answers</summary>{questions.map((question,questionIndex)=><article key={question.question}><h5>{questionIndex+1}. {question.question}</h5>{answers[questionIndex]?<audio controls src={answers[questionIndex].url} aria-label={`Your answer to question ${questionIndex+1}`}/>:null}<p><strong>Key facts:</strong> {question.reference}</p></article>)}</details>
   <button type="button" className="secondary-btn" onClick={()=>setIndex(0)}>Record again</button>
  </div>}
 </section>;
}
