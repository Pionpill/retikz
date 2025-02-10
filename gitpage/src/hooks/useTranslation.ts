import { defaultLocale, locales } from '@/config';
import { createInstance } from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next/initReactI18next';

const initI18next = async (lng = defaultLocale, ns = 'server') => {
  const i18nInstance = createInstance();
  await i18nInstance
    .use(initReactI18next)
    .use(resourcesToBackend((lng: string, ns: string) => import(`../../public/locales/${lng}/${ns}.json`)))
    .init({
      debug: true,
      supportedLngs: locales,
      fallbackLng: defaultLocale,
      lng,
      fallbackNS: 'server',
      defaultNS: 'server',
      ns,
    });
  return i18nInstance;
};

const useTranslation = async (lng: string, ns: string = 'server', options: { prefix?: string } = {}) => {
  const i18nextInstance = await initI18next(lng, ns);
  return {
    t: i18nextInstance.getFixedT(lng, ns, options.prefix),
    i18n: i18nextInstance,
  };
};

export default useTranslation;
