import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import { en, zh } from './locales';
import { supportedLanguages } from './preferences';

/** 把 i18next 当前语言同步到文档根节点 */
const syncDocumentLanguage = (language: string): void => {
  document.documentElement.lang = language.startsWith('en') ? 'en' : 'zh-CN';
};

i18n.on('languageChanged', syncDocumentLanguage);

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: zh },
      en: { translation: en },
    },
    fallbackLng: 'zh',
    supportedLngs: supportedLanguages,
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'retikz-bench-lang',
    },
  })
  .then(() => syncDocumentLanguage(i18n.resolvedLanguage ?? i18n.language));

export default i18n;
