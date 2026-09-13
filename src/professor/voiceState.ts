export type ProfessorVoiceState = 'awaiting_professor' | 'initializing' | 'idle' | 'listening' | 'thinking' | 'speaking' | 'state_unavailable' | 'reconnecting';
const states = new Set<ProfessorVoiceState>(['initializing','idle','listening','thinking','speaking']);
/** Presentation of SDK-published state only; never an identity or authorization check. */
export function observedProfessorState(peers: ReadonlyArray<{attributes: Readonly<Record<string,string>>}>): ProfessorVoiceState {
 const agents = peers.filter(p => Object.prototype.hasOwnProperty.call(p.attributes,'lk.agent.state'));
 if(agents.length === 0) return 'awaiting_professor';
 if(agents.length !== 1) return 'state_unavailable';
 const reported = agents[0].attributes['lk.agent.state'];
 return states.has(reported as ProfessorVoiceState) ? reported as ProfessorVoiceState : 'state_unavailable';
}
export function professorVoiceLabel(state: ProfessorVoiceState): string {
 return ({awaiting_professor:'WAITING FOR PROFESSOR',initializing:'PREPARING THE SESSION',idle:'WAITING FOR YOU',listening:'LISTENING',thinking:'PREPARING A RESPONSE',speaking:'SPEAKING',state_unavailable:'CONNECTED · STATE UNAVAILABLE',reconnecting:'RECONNECTING'})[state];
}
