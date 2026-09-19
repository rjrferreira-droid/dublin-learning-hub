import {Component,lazy,Suspense,type ComponentProps,type ReactNode} from 'react';
import type {ProfessorSessionPanel as PanelType} from './ProfessorSessionPanel';
const Panel=lazy(()=>import('./ProfessorSessionPanel').then(m=>({default:m.ProfessorSessionPanel})));
class VoicePanelBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<section role="alert" className="session-load-error"><h3>The Professor panel could not load</h3><p>The connection has not been started by this message. Check your connection and reload the page. Reloading discards unsaved local drafts, not your stored learning history.</p><button type="button" onClick={()=>window.location.reload()}>Reload page</button></section>:this.props.children;}
}
/** Loaded when the Professor view opens, before Start is available; keeps the audio user gesture. */
export function ProfessorSessionPanel(props:ComponentProps<typeof PanelType>){
 return <VoicePanelBoundary><Suspense fallback={<p role="status" aria-live="polite">Loading Professor controls… No voice session has started.</p>}><Panel {...props}/></Suspense></VoicePanelBoundary>;
}
