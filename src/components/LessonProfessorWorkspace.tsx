import {useCallback,useEffect,useState} from 'react';
import {ProfessorSessionPanel} from './DeferredProfessorPanel';
import type {LearnerKey} from '../learners/profiles';
import type {WorkshopTrack} from '../learning/appliedPractice';
import '../professor/lesson-workspace.css';
type Props={track:WorkshopTrack;lessonId:string;learnerKey:LearnerKey;activeTab:string;onTabChange:(tab:string)=>void;onActivityChange:(busy:boolean)=>void};
/** Mount once after an explicit Professor visit; keep that exact instance within this lesson only. */
export function LessonProfessorWorkspace({track,lessonId,learnerKey,activeTab,onTabChange,onActivityChange}:Props){
 const focused=activeTab==='Professor';const [visited,setVisited]=useState(focused);const [busy,setBusy]=useState(false);
 useEffect(()=>{if(focused)setVisited(true);},[focused]);
 const handleActivity=useCallback((next:boolean)=>{setBusy(next);onActivityChange(next);},[onActivityChange]);
 if(!visited&&!focused)return null;
 return <section className={'lesson-professor-workspace'+(!focused?' compact':'')} hidden={!focused&&!busy} data-testid="lesson-professor-workspace" aria-label="Professor in this lesson">
  {focused?<p className="lesson-conversation-boundary">During a voice session you can consult the written tabs without starting another session. Switching tabs does not pause usage. Muting affects only the microphone; End session disconnects. Leaving this lesson disconnects. Audio playback is kept separate to avoid competing voices.</p>:<div className="lesson-live-context"><strong>Professor connection stays with this lesson</strong><span>The microphone and usage may remain active while you study. Use the controls below; closing this lesson disconnects.</span><button type="button" onClick={()=>onTabChange('Professor')}>Return to Professor</button></div>}
  <ProfessorSessionPanel lessonId={lessonId} track={track} learnerKey={learnerKey} compact={!focused} onActivityChange={handleActivity}/>
 </section>;
}
