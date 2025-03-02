import i18n from 'i18next';
import { FC, PropsWithChildren } from 'react';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import useLang from './hooks/useLang';
import resources from './i18n';

const I18nProvider: FC<PropsWithChildren> = ({ children }) => {
    const { lang } = useLang();
  
    i18n.use(initReactI18next).init({
      resources,
      lng: lang,
      interpolation: {
        escapeValue: false,
      },
    });
  
    return (
      <I18nextProvider defaultNS="translation" i18n={i18n}>
        {children}
      </I18nextProvider>
    );
  };

export default I18nProvider;