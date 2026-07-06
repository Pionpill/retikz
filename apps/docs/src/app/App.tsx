import { Toaster } from 'sonner';

import { ErrorBoundary } from './ErrorBoundary';
import { AppRoutes } from './routes';
import { useDocShortcuts } from './useDocShortcuts';

export const App = () => {
  useDocShortcuts();
  return (
    <ErrorBoundary>
      <AppRoutes />
      <Toaster position="top-center" />
    </ErrorBoundary>
  );
};
