import { useId } from 'react';
import { GOAL_OPTIONS, type SessionPreparation } from '../learning/sessionPreparation';
import '../professor/session-experience.css';
type Props={value:SessionPreparation;onChange:(value:SessionPreparation)=>void;disabled?:boolean};
export function SessionPreparationPanel({value,onChange,disabled=false}:Props){
 const id=useId();
 return <details className="session-preparation" data-testid="session-preparation">
  <summary>Shape this conversation <span>{GOAL_OPTIONS.find(o=>o.value===value.goal)!.label}</span></summary>
  <div className="session-preparation-body">
   <p>Choose what would help today. These preferences do not change your course, model or learning scores.</p>
   <fieldset disabled={disabled}><legend>Today I want to…</legend><div className="preparation-goals">
    {GOAL_OPTIONS.map(o=><label key={o.value}><input type="radio" name={id+'-goal'} value={o.value} checked={value.goal===o.value} onChange={()=>onChange({...value,goal:o.value})}/><span><strong>{o.label}</strong><small>{o.hint}</small></span></label>)}
   </div></fieldset>
   <div className="preparation-selects">
    <label htmlFor={id+'-pace'}>Conversation pace<select id={id+'-pace'} value={value.pace} disabled={disabled} onChange={e=>onChange({...value,pace:e.target.value as SessionPreparation['pace']})}><option value="balanced">Balanced</option><option value="patient">More time to think</option></select></label>
    <label htmlFor={id+'-support'}>Language support<select id={id+'-support'} value={value.support} disabled={disabled} onChange={e=>onChange({...value,support:e.target.value as SessionPreparation['support']})}><option value="profile">Use my existing profile</option><option value="pt-BR">Portuguese support when needed</option><option value="en">Keep support in English</option></select></label>
   </div>
   <p className="preparation-note">Nothing starts here. Only clicking Start sends these choices with the session request. Your written drafts and quiz answers are not included. The tutor’s actual response to these preferences still needs voice validation.</p>
  </div>
 </details>;
}
