import './i18n';
import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app';

const root = document.getElementById('root');
if (root === null) throw new Error('Performance Lab root is unavailable');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
