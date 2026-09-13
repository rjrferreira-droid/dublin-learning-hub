import {useId,useState} from 'react';
import {studyPackFor,type StudyPack,type StudyTrack} from '../learning/teachingPacks';
import '../professor/learning-guide.css';

type Props={track:StudyTrack;lessonId?:string;phase:'ready'|'ended'};
export function ProfessorLearningGuide({track,lessonId,phase}:Props){
 const pack=studyPackFor(track,lessonId);
 return pack?<StudyGuide key={`${pack.id}:${phase}`} pack={pack} phase={phase}/>:null;
}
function StudyGuide({pack,phase}:{pack:StudyPack;phase:Props['phase']}){
 const id=useId();const [index,setIndex]=useState(0);const [hints,setHints]=useState(0);const [showAnswer,setShowAnswer]=useState(false);
 const exercise=pack.exercises[index];
 function next(){setIndex((index+1)%pack.exercises.length);setHints(0);setShowAnswer(false);}
 return <section className="professor-study-guide" data-testid="professor-study-guide" aria-labelledby={`${id}-title`}>
  <header className="study-guide-heading"><span className="study-eyebrow">{phase==='ended'?'CONTINUE AT YOUR PACE':'A CLEAR START'}</span><span className="study-local-badge">Study companion · no AI call</span></header>
  <h3 id={`${id}-title`}>{pack.title}</h3><p className="study-goal">{pack.goal}</p>
  <div className="study-skill-row" aria-label="Lesson focus">{pack.skills.map(skill=><span key={skill}>{skill}</span>)}</div>
  <div className="study-learning-path" aria-label="Suggested learning sequence"><span><b>01</b> Understand</span><span><b>02</b> Try it</span><span><b>03</b> Explain it</span></div>
  <details className="study-disclosure"><summary>Prepare with an example</summary><div className="study-disclosure-body">
   <p>{pack.concept}</p><details className="study-portuguese"><summary>Explicação em português</summary><p lang="pt-BR">{pack.conceptPt}</p></details>
   <h4>{pack.example.title}</h4><p className="study-assumptions">{pack.example.assumptions}</p><ol>{pack.example.steps.map(step=><li key={step}>{step}</li>)}</ol>
  </div></details>
  <details className="study-disclosure"><summary>Practise without starting a voice session</summary><div className="study-disclosure-body" data-testid="study-practice">
   <span className="study-eyebrow">Practice {index+1} of {pack.exercises.length} · self-check, not an assessment</span>
   <h4>{exercise.question}</h4><p className="study-instruction">Try an answer in your own words first. Nothing here is recorded or graded.</p>
   <div aria-live="polite" className="study-hints">{exercise.hints.slice(0,hints).map((hint,i)=><p key={hint}><strong>Hint {i+1}.</strong> {hint}</p>)}</div>
   <div className="study-practice-actions"><button type="button" disabled={hints===2||showAnswer} onClick={()=>setHints(Math.min(2,hints+1))}>Give me a hint</button><button type="button" disabled={showAnswer} onClick={()=>setShowAnswer(true)}>Show worked answer</button></div>
   {showAnswer&&<div className="study-worked-answer" data-testid="study-worked-answer" aria-live="polite"><strong>One worked response</strong><p>{exercise.answer}</p><p>{exercise.explanation}</p><button type="button" onClick={next}>Next practice</button></div>}
  </div></details>
  <details className="study-disclosure"><summary>Use it in a real conversation</summary><div className="study-disclosure-body"><p>{pack.transfer}</p><p>Ask for a smaller example when you need one, and tell the tutor when the pace is not right. These are suggestions to say aloud, not commands sent by this guide.</p></div></details>
  <details className="study-disclosure"><summary>Scope and checked sources</summary><div className="study-disclosure-body"><p>{pack.coverageNote}</p><p>This companion is not yet part of the live Professor’s lesson context. It supplements preparation; it does not replace the complete Golden Lesson.</p><p>Sources checked: {pack.reviewedOn}. Rules can change.</p><ul>{pack.sources.map(source=><li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a></li>)}</ul></div></details>
  <footer className="study-guide-footer">No answer submission, mastery score or history update. Reading a worked answer is not evidence of mastery.</footer>
 </section>;
}
