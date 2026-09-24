import {useEffect,useRef,useState} from 'react';
import type {AudioQuestion} from '../learning/audioQuestions';
import {isFeatureEnabled} from '../config/features';
import {assessEnglishAudioAnswer,type EnglishAudioAssessment,type EnglishAudioSkill} from '../services/englishAudioAssessment';

const MAX_SECONDS=60;
const ENGLISH_SKILLS:[EnglishAudioSkill,string][]=[
 ['comprehension','Listening comprehension'],['response_quality','Response quality'],['grammar','Grammar'],
 ['vocabulary','Vocabulary'],['pronunciation','Pronunciation'],['intonation','Intonation'],['fluency','Fluency'],
];
type RecordedAnswer={url:string;blob:Blob;seconds:number;attemptId:string;heardEpisode:boolean};

export function AudioAnswerPractice({lessonId,questions,active,canRecord,previewAllowed=false}:{lessonId:string;questions:readonly AudioQuestion[];active:boolean;canRecord:boolean;previewAllowed?:boolean}){
 const [recordingIndex,setRecordingIndex]=useState<number|null>(null);
 const [requestingIndex,setRequestingIndex]=useState<number|null>(null);
 const [elapsed,setElapsed]=useState(0);
 const [answers,setAnswers]=useState<(RecordedAnswer|null)[]>(()=>questions.map(()=>null));
 const [error,setError]=useState<{index:number;message:string}|null>(null);
 const [assessments,setAssessments]=useState<(EnglishAudioAssessment|null)[]>(()=>questions.map(()=>null));
 const [assessingIndex,setAssessingIndex]=useState<number|null>(null);
 const [assessmentError,setAssessmentError]=useState<string|null>(null);
 const recorder=useRef<MediaRecorder|null>(null);
 const stream=useRef<MediaStream|null>(null);
 const started=useRef(0);
 const answersRef=useRef<(RecordedAnswer|null)[]>(answers);
 const urls=useRef(new Set<string>());
 const mounted=useRef(false);
 const activeRef=useRef(active);
 const requesting=useRef(false);
 const assessmentRunning=useRef(false);
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
 const eligible=completed===questions.length&&canRecord&&answers.every(answer=>answer?.heardEpisode);
 const assessmentEnabled=isFeatureEnabled('englishAudioAssessment');
 const assessed=assessments.filter(Boolean).length;
 const previewAnswers=answers.some(answer=>answer&&!answer.heardEpisode);

 async function start(questionIndex:number){
  if(!activeRef.current||requesting.current||assessmentRunning.current||recorder.current||recordingIndex!==null||!canStart)return;
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
      const blob=new Blob(chunks,{type:capture.mimeType});
      const url=URL.createObjectURL(blob);
      const previous=answersRef.current[questionIndex];
      if(previous){URL.revokeObjectURL(previous.url);urls.current.delete(previous.url);}
      urls.current.add(url);
      const updated=answersRef.current.slice();updated[questionIndex]={url,blob,seconds,attemptId:crypto.randomUUID(),heardEpisode:canRecord};
      answersRef.current=updated;setAnswers(updated);
      setAssessments(previous=>previous.map((result,index)=>index===questionIndex?null:result));
      setAssessmentError(null);
     }else setError({index:questionIndex,message:'The recording was empty. Please try again.'});
     setRecordingIndex(null);
    }
   };
   started.current=Date.now();setElapsed(0);
   capture.start();setRecordingIndex(questionIndex);
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

 async function assessAll(){
  if(!eligible||!assessmentEnabled||assessmentRunning.current||!activeRef.current)return;
  assessmentRunning.current=true;setAssessmentError(null);
  try{
   for(let index=0;index<questions.length;index++){
    const answer=answersRef.current[index];
    if(!answer||!answer.heardEpisode)throw Error('Listen to the episode and re-record every preview answer first.');
    if(assessments[index]?.attempt_id===answer.attemptId)continue;
    setAssessingIndex(index);
    const result=await assessEnglishAudioAnswer(lessonId,index,answer.attemptId,answer.blob);
    if(!mounted.current)return;
    if(answersRef.current[index]?.attemptId!==result.attempt_id)throw Error('An answer changed during assessment. Try again.');
    setAssessments(previous=>previous.map((value,position)=>position===index?result:value));
   }
  }catch(cause){if(mounted.current)setAssessmentError(cause instanceof Error?cause.message:'Assessment could not finish. Try again.');}
  finally{assessmentRunning.current=false;if(mounted.current)setAssessingIndex(null);}
 }

 const skillSummary=(skill:EnglishAudioSkill)=>{
  if(assessed!==questions.length)return 'Awaiting assessment';
  const scores=assessments.map(result=>result?.skills[skill].score);
  if(scores.some(score=>score==null))return 'Not assessed';
  return `${Math.round(scores.reduce<number>((sum,score)=>sum+Number(score),0)/questions.length)}%`;
 };

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
      <div className="audio-record-actions"><button type="button" disabled={!canStart||requestingIndex!==null||assessingIndex!==null||(recordingIndex!==null&&!recording)||!active} onClick={recording?stop:()=>void start(questionIndex)}>{requestingIndex===questionIndex?'Waiting for microphone…':recording?'Stop recording':answer?'Record again':'Record answer'}</button>
       {answer&&!recording?<audio controls src={answer.url} aria-label={`Your answer to question ${questionIndex+1}`}/>:null}
       <span className="audio-record-time">{recording?`${MAX_SECONDS-elapsed}s left`:answer?`Recorded · ${answer.seconds}s${answer.heardEpisode?'':' · preview'}`:'Up to 1:00'}</span></div>
      {error?.index===questionIndex?<p role="alert" className="audio-answer-error">{error.message}</p>:null}
      {assessments[questionIndex]?.attempt_id===answer?.attemptId?<div className="audio-question-feedback"><strong>Feedback for this answer</strong><p>{assessments[questionIndex]?.feedback}</p><details><summary>Transcript and skill notes</summary><p><strong>Heard:</strong> {assessments[questionIndex]?.transcript||'Transcript was not retained. Replay your local recording above.'}</p>{ENGLISH_SKILLS.map(([key,label])=><p key={key}><strong>{label}:</strong> {assessments[questionIndex]?.skills[key].score==null?'Not assessed':`${Math.round(assessments[questionIndex]!.skills[key].score!)}%`} · {assessments[questionIndex]?.skills[key].feedback}</p>)}</details></div>:null}
     </div>
    </article>;
   })}
  </div>
  <div className="audio-answer-review" aria-label="Activity summary">
   <div className="audio-summary-heading"><div><span className="audio-summary-kicker">ACTIVITY SUMMARY</span><h4>Your listening practice</h4></div><span className="audio-summary-progress">{completed} of {questions.length} recorded</span></div>
   <p>{assessed===questions.length?'Assessment complete. Review feedback for each answer above. These scores are formative estimates.':completed===questions.length?'All five answers are recorded. Replay them above and compare the key facts below.':'Record your answers above to complete the activity. You can replay or replace any answer.'}</p>
   <div className="audio-skill-grid" aria-label="Assessment by skill">{ENGLISH_SKILLS.map(([key,label])=><div className="audio-skill" key={key}><span>{label}</span><strong>{skillSummary(key)}</strong></div>)}</div>
   <p className="audio-summary-note">{previewAnswers?'Preview answers are not listening evidence. After the episode plays, re-record them to request assessment. ':''}Your recordings stay available here until this lesson closes. Assessment sends a copy for analysis; the app does not save its audio or transcript to the database. Feedback and scores are held privately for retries and expire after 30 days; cleanup runs on the next assessment request. {assessed===questions.length?'A score is shown only where the recording provides enough evidence.':'No score is inferred from a recording before assessment.'}</p>
   {completed===questions.length?<div className="audio-assessment-actions"><button type="button" onClick={()=>void assessAll()} disabled={!eligible||!assessmentEnabled||assessingIndex!==null||!active}>{assessingIndex!==null?`Assessing answer ${assessingIndex+1} of ${questions.length}…`:assessed===questions.length?'Recheck assessments':'Assess my five answers'}</button><small>{!assessmentEnabled?'Voice assessment awaits Preview activation.':!canRecord?'Listen to the full episode first.':previewAnswers?'Re-record preview answers after listening.':assessed===questions.length?'Your five answers have been assessed.':'Each recording is checked separately; you can retry a failed check.'}</small></div>:null}
   {assessmentError?<p className="audio-answer-error" role="alert">{assessmentError}</p>:null}
   {completed===questions.length?<details><summary>Review reference answers</summary>{questions.map((question,questionIndex)=><article key={question.question}><h5>{questionIndex+1}. {question.question}</h5><p><strong>Key facts:</strong> {question.reference}</p></article>)}</details>:null}
  </div>
 </section>;
}
