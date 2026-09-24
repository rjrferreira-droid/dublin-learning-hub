import React,{lazy,Suspense} from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
const App=lazy(()=>import('./App'));
import { AuthGate } from './components/AuthGate';
import { CostCenterPanel } from './components/CostCenterPanel';
import { LittleEnglish } from './components/LittleEnglish';
import { presentation } from './config/presentation';
import { curriculumPreviewRuntimeEnabled } from './config/curriculumPreview';
import { WorkspaceLoadBoundary } from './components/WorkspaceLoadBoundary';
import './styles.css';
import './british-premium.css';
import './premium-audio.css';
import './professor.css';
import './learning-intelligence.css';
import './learning-memory-panel.css';
import './cost-center.css';
import './auth.css';
import './little-english.css';
import './adult-mobile-utilities.css';
import './mock-exam.css';
import './course-shell.css';

const manuzinhaMode = new URLSearchParams(window.location.search).get('manuzinha') === '1';
document.documentElement.dataset.curriculumPreview = curriculumPreviewRuntimeEnabled ? 'enabled' : 'disabled';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      {manuzinhaMode ? (
        <LittleEnglish standalone />
      ) : (
        <AuthGate>
          <WorkspaceLoadBoundary>
            <Suspense fallback={<p role="status" className="workspace-loading">Preparing your learning workspace…</p>}><App /></Suspense>
          </WorkspaceLoadBoundary>
          {presentation.showManuLauncher && <LittleEnglish />}
          <CostCenterPanel />
        </AuthGate>
      )}
    </BrowserRouter>
  </React.StrictMode>,
);
