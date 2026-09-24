import type {SessionReceipt} from '../professor/sessionReceipt';
import '../professor/session-receipt.css';
const usd=(v:number|null)=>v===null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:4}).format(v);
export function SessionReceiptPanel({receipt}:{receipt:SessionReceipt}){
 const title=receipt.state==='settled'?'Usage estimate recorded':receipt.state==='needs_reconciliation'?'Needs reconciliation':receipt.state==='completed_without_usage'?'Closed · usage estimate pending':receipt.state==='not_completed'?'Session not finalized':'Settlement processing';
 return <section className={'session-receipt state-'+receipt.state} data-testid="session-receipt" aria-label="Session cost and reconciliation status">
  <h3>{title}</h3><p>{receipt.note}</p>
  <dl><div><dt>Realtime estimate</dt><dd>{usd(receipt.loggedRealtimeUsd)}</dd></div><div><dt>Evaluator estimate</dt><dd>{usd(receipt.loggedEvaluationUsd)}</dd></div><div><dt>Logged total</dt><dd>{usd(receipt.loggedTotalUsd)}</dd></div><div><dt>Original reservation</dt><dd>{usd(receipt.reservedUsd)}</dd></div></dl>
  <p className="receipt-limit">Application estimates only — not a provider invoice. A reservation can remain protected while evidence is incomplete.</p>
 </section>;
}
