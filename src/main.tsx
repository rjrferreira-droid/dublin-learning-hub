import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { CostCenterPanel } from './components/CostCenterPanel';
import './styles.css';
import './british-premium.css';
import './premium-audio.css';
import './professor.css';
import './learning-intelligence.css';
import './cost-center.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <CostCenterPanel />
    </BrowserRouter>
  </React.StrictMode>,
);
