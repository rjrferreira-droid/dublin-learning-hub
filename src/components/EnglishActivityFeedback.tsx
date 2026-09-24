import type {EnglishActivityResult} from '../learning/englishActivityAssessment';
const labels:Record<string,string>={grammar:'Grammar',vocabulary:'Vocabulary',context:'Context and relevance',clarity:'Clarity',pronunciation:'Pronunciation'};
export function EnglishActivityFeedback({result}:{result:EnglishActivityResult}){
 return <div className="lesson-answer-feedback english-activity-feedback" role="status">
  <strong>Feedback</strong><p>{result.strength}</p><p><b>Next step:</b> {result.next_step}</p>
  <div className="english-skill-results">{Object.entries(result.skills).map(([key,value])=><p key={key}><b>{labels[key]??key}: {value.score===null?'Not assessed':`${value.score}%`}</b><br/>{value.feedback}</p>)}</div>
  {result.model_response?<details><summary>One possible improved response</summary><p>{result.model_response}</p></details>:null}
  <small>Formative feedback · saved privately for 30 days.</small>
 </div>;
}
