import { createRoot } from 'react-dom/client';
import { FC, StrictMode } from 'react';
import useLang from './hooks/useLang';
import I18nProvider from './I18nProvider';
import './index.css';
import useTheme from './hooks/useTheme';

// eslint-disable-next-line react-refresh/only-export-components
const Root: FC = () => {
  const { lang } = useLang();
  const { theme } = useTheme();

  const html = document.querySelector('html');
  html?.setAttribute('lang', lang);
  html?.classList.add(theme === 'dark' ? 'dark' : 'light');

  return (
    <StrictMode>
      <I18nProvider></I18nProvider>
    </StrictMode>
  );
};

createRoot(document.querySelector('body')!).render(<Root />);
