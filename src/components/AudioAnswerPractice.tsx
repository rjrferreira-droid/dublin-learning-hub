import {useEffect,useRef,useState} from 'react';
import type {AudioQuestion} from '../learning/audioQuestions';

const MAX_SECONDS=60;
const ENGLISH_SKILLS=['Listening comprehension','Response quality','Grammar','Vocabulary','Pronunciation','Intonation','Fluency'] as const;
type RecordedAnswer={url:string;seconds:number};

export function AudioAnswerPractice({questions,active,canRecord,previewAllowed=false}:{questions:readonly AudioQuestion[];active:boolean;canRecord:boolean;previewAllowed?:boolean}){
 const [recordingIndex,setRecordingIndex]=useState<number|null>(null);
 const [requestingIndex,setRequestingIndex]=useState<number|null>(null);
 const [elapsed,setElapsed]=useState(0);
 const [answers,setAnswers]=useState<(RecordedAnswer|null)[]>(()=>questions.map(()=>null));
 const [previewMode,setPreviewMode]=useState(false);
 const [error,setError]=useState<{index:number;message:string}|null>(null);
 const recorder=useRef<MediaRecorder|null>(null);
 const stream=useRef<MediaStream|null>(null);
 const started=useRef(0);
 const answersRef=useRef<(RecordedAnswer|null)[]>(answers);
 const urls=useRef(new Set<string>());
 const mounted=useRef(false);
 const activeRef=useRef(active);
 const requesting=useRef(false);
 const clock=useRef<ReturnType<typeof setInterval>|null>(null);
 const limit=useRef<ReturnType<typeof setTimeout>|null>(null);
 activeRef.current=active;

 useEffect(()=>{
  mounted.current=true;
  return ()=>{
   mounted.current=false;
   if(recorder.current)recorder.current.onstop=null;
   if(recorder.current?.state==='recording')recorder.current.stop();
   stream.current?.getTracks().forEach(track=>track.stop());
   if(clock.current)clearInterval(clock.current);
   if(limit.current)clearTimeout(limit.current);
   urls.current.forEach(url=>URL.revokeObjectURL(url));
   urls.current.clear();
  };
 },[]);
 useEffect(()=>{if(!active)stop();},[active]);
 if(questions.length===0)return null;

 const completed=answers.filter(Boolean).length;
 const canStart=canRecord||previewAllowed;

 async function start(questionIndex:number){
  if(!activeRef.current||requesting.current||recorder.current||recordingIndex!==null||!canStart)return;
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){
   setError({index:questionIndex,message:'This browser cannot record a voice answer. Try a browser with microphone access.'});return;
  }
  requesting.current=true;
  setRequestingIndex(questionIndex);
  setError(null);
  try{
   const input=await navigator.mediaDevices.getUserMedia({audio:true});
   if(!mounted.current||!activeRef.current){input.getTracks().forEach(track=>track.stop());return;}
   const preferred=['audio/webm;codecs=opus','audio/mp4'].find(type=>MediaRecorder.isTypeSupported(type));
   const capture=new MediaRecorder(input,preferred?{mimeType:preferred}:undefined);
   const chunks:BlobPart[]=[];
   stream.current=input;recorder.current=capture;
   capture.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
   capture.onstop=()=>{
    input.getTracks().forEach(track=>track.stop());
    stream.current=null;recorder.current=null;
    if(mounted.current){
     if(chunks.length){
      const seconds=Math.min(MAX_SECONDS,Math.max(1,Math.round((Date.now()-started.current)/1000)));
      const url=URL.createObjectURL(new Blob(chunks,{type:capture.mimeType}));
      const previous=answersRef.current[questionIndex];
      if(previous){URL.revokeObjectURL(previous.url);urls.current.delete(previous.url);}
      urls.current.add(url);
      const updated=answersRef.current.slice();updated[questionIndex]={url,seconds};
      answersRef.current=updated;setAnswers(updated);
     }else setError({index:questionIndex,message:'The recording was empty. Please try again.'});
     setRecordingIndex(null);
    }
   };
   started.current=Date.now();setElapsed(0);
   capture.start();setRecordingIndex(questionIndex);
   if(!canRecord)setPreviewMode(true);
   clock.current=setInterval(()=>setElapsed(Math.min(MAX_SECONDS,Math.floor((Date.now()-started.current)/1000))),250);
   limit.current=setTimeout(stop,MAX_SECONDS*1000);
  }catch{
   stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;recorder.current=null;
   if(mounted.current)setError({index:questionIndex,message:'Microphone access was not granted. Check your browser permission and try again.'});
  }finally{requesting.current=false;if(mounted.current)setRequestingIndex(null);}
 }
 function stop(){
  if(clock.current)clearInterval(clock.current);clock.current=null;
  if(limit.current)clearTimeout(limit.current);limit.current=null;
  if(recorder.current?.state==='recording')recorder.current.stop();
 }

 return <section className="audio-answer-practice" aria-label="Listening questions">
  <div className="audio-answer-heading"><h3>Answer in your own words</h3><span>{questions.length} questions · up to 1 min each</span></div>
  <p>{canRecord?'Answer each question in English. You can replay the episode or open the transcript at any time.':previewAllowed?'Preview mode: all five questions are available while the episode is being prepared. You can record answers, but they will not be graded as listening comprehension.':'The questions are below. Finish listening to the episode to enable recording.'}</p>
  <div className="audio-answer-list">
   {questions.map((question,questionIndex)=>{
    const answer=answers[questionIndex];
    const recording=recordingIndex===questionIndex;
    return <article className="audio-answer-card" key={question.question}>
     <span className="audio-answer-number" aria-hidden="true">{questionIndex+1}</span>
     <div className="audio-answer-content">
      <div className="audio-answer-top"><strong>QUESTION {questionIndex+1} OF {questions.length}</strong></div>
      <h4>{question.question}</h4>
      <div className="audio-record-actions"><button type="button" disabled={!canStart||requestingIndex!==null||(recordingIndex!==null&&!recording)||!active} onClick={recording?stop:()=>void start(questionIndex)}>{requestingIndex===questionIndex?'Waiting for microphone…':recording?'Stop recording':answer?'Record again':'Record answer'}</button>
       {answer&&!recording?<audio controls src={answer.url} aria-label={`Your answer to question ${questionIndex+1}`}/>:null}
       <span className="audio-record-time">{recording?`${MAX_SECONDS-elapsed}s left`:answer?`Recorded · ${answer.seconds}s`:'Up to 1:00'}</span></div>
      {error?.index===questionIndex?<p role="alert" className="audio-answer-error">{error.message}</p>:null}
     </div>
    </article>;
   })}
  </div>
  <div className="audio-answer-review" aria-label="Activity summary">
   <div className="audio-summary-heading"><div><span className="audio-summary-kicker">ACTIVITY SUMMARY</span><h4>Your listening practice</h4></div><span className="audio-summary-progress">{completed} of {questions.length} recorded</span></div>
   <p>{completed===questions.length?'All five answers are recorded. Replay them above and compare the key facts below.':'Record your answers above to complete the activity. You can replay or replace any answer.'}</p>
   <div className="audio-skill-grid" aria-label="Assessment by skill">{ENGLISH_SKILLS.map(skill=><div className="audio-skill" key={skill}><span>{skill}</span><strong>Awaiting assessment</strong></div>)}</div>
   <p className="audio-summary-note">{previewMode?'This was a question and microphone preview without the episode. Listening comprehension was not assessed. ':'Your recordings are available only while this lesson is open. '}Automatic voice feedback is not available yet; no skill score is inferred from a recording.</p>
   {completed===questions.length?<details><summary>Review reference answers</summary>{questions.map((question,questionIndex)=><article key={question.question}><h5>{questionIndex+1}. {question.question}</h5><p><strong>Key facts:</strong> {question.reference}</p></article>)}</details>:null}
  </div>
 </section>;
}
