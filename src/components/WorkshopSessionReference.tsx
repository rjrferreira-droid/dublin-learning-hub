import {selectedWorkshop,type WorkshopSelection} from '../learning/workshopSelection';
import type {WorkshopTrack} from '../learning/appliedPractice';
import '../professor/workshop-reference.css';
export function WorkshopSessionReference({track,selection,busy,onClear}:{track:WorkshopTrack;selection:WorkshopSelection|null;busy:boolean;onClear?:()=>void}){
 const workshop=selectedWorkshop(track,selection);if(!workshop)return null;
 return <section className="workshop-session-reference" data-testid="workshop-session-reference" aria-label="Selected workshop reference">
  <strong>{busy?'Scenario for this session':'Scenario prepared for your next Start'}</strong><span>{workshop.title}</span>
  <p>{busy?'This session keeps its starting scenario. Browsing other exercises does not change it.':'The server will supply this scenario to the Professor and evaluator when you click Start. Preparing it does not start a call.'} Your written answers and local results are not sent.</p>
  {!busy&&onClear&&<button type="button" onClick={onClear}>Use the standard lesson instead</button>}
 </section>;
}
