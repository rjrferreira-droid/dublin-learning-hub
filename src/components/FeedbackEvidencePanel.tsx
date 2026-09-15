import type {StoredFeedbackDetails} from '../professor/sessionOutcome';
import '../professor/feedback-evidence.css';
/** This is a display of the stored assessment, never a new evaluator or a provenance certificate. */
export function FeedbackEvidencePanel({details}:{details:StoredFeedbackDetails}){
 if(details.assessmentConfidence===null&&details.corrections.length===0)return null;
 return <details className="feedback-evidence" data-testid="feedback-evidence">
  <summary>Examples and limits of this assessment</summary>
  {details.assessmentConfidence!==null&&<p className="feedback-confidence">Evaluator’s reported confidence: <strong>{details.assessmentConfidence}/100</strong>. This is not your score or level of mastery, and is not an independently calibrated probability.</p>}
  {details.corrections.map((item,index)=><article className="feedback-correction" key={index}>
   <h4>{item.label}: {item.pattern}</h4>
   <span className="feedback-quote-label">Example stored with the assessment</span><blockquote>{item.example}</blockquote>
   <span className="feedback-quote-label">Suggested correction</span><p>{item.correction}</p>
  </article>)}
  <p className="feedback-evidence-limit">These are excerpts recorded in the assessment, not independently rechecked by this screen. A quoted sentence does not by itself prove an error. Transcript-only evaluation does not measure pronunciation, accent, pauses or speech rate.</p>
 </details>;
}
