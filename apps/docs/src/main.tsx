import { FC, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import useLang from './hooks/useLang';
import useTheme from './hooks/useTheme';
import I18nProvider from './I18nProvider';
import './index.css';
import AppRoute from './routes';

// eslint-disable-next-line react-refresh/only-export-components
const Root: FC = () => {
  const { lang } = useLang();
  const { theme } = useTheme();

  const html = document.querySelector('html');
  html?.setAttribute('lang', lang);
  html?.classList.remove(theme === 'dark' ? 'light' : 'dark');
  html?.classList.add(theme === 'dark' ? 'dark' : 'light');

  return (
    <StrictMode>
      <I18nProvider>
        <AppRoute />
      </I18nProvider>
    </StrictMode>
  );
};

createRoot(document.querySelector('body')!).render(<Root />);
