import './i18n';
import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

import { createBenchBrowserRouter } from './app';

const root = document.getElementById('root');
if (root === null) throw new Error('Performance Lab root is unavailable');
const router = createBenchBrowserRouter();

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
