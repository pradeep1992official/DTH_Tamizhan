import { GlobalErrorBoundary } from './components/ErrorPages';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorBoundary><App /></GlobalErrorBoundary>
  </StrictMode>,
);
