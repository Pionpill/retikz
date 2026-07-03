import { Toaster } from 'sonner';

import { AppErrorBoundary } from '@/components/shared/error-boundary';

import { AppRoutes } from './routes';
import { useDocShortcuts } from './use-doc-shortcuts';

export const App = () => {
  useDocShortcuts();
  return (
    <AppErrorBoundary>
      <AppRoutes />
      <Toaster position="top-center" />
    </AppErrorBoundary>
  );
};
