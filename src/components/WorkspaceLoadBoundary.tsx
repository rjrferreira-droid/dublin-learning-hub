import {Component,type ReactNode} from 'react';
export class WorkspaceLoadBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<section role="alert" className="auth-loading-card"><h2>Your workspace could not load</h2><p>Check your connection and reload. Your stored history has not been reset. Any unsaved local drafts will be lost when you reload.</p><button type="button" onClick={()=>window.location.reload()}>Reload workspace</button></section>:this.props.children;}
}
