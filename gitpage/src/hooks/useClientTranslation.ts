'use client';

import { defaultLocale, locales } from '@/config';
import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';
import { useEffect } from 'react';
import { initReactI18next, useTranslation as useTranslationOrg } from 'react-i18next';
export const cookieName = 'i18next';

const runsOnServerSide = typeof window === 'undefined';

i18next
  .use(initReactI18next)
  .use(LanguageDetector)
  .use(resourcesToBackend((lng: string, ns: string) => import(`../../public/locales/${lng}/${ns}.json`)))
  .init({
    supportedLngs: locales,
    fallbackLng: defaultLocale,
    lng: defaultLocale,
    fallbackNS: 'common',
    defaultNS: 'common',
    ns: 'common',
    detection: {
      order: ['path', 'htmlTag', 'cookie', 'navigator'],
    },
    preload: runsOnServerSide ? locales : [],
  });

const useClientTranslation = (lng: string, ns: string = 'common', options: { prefix?: string } = {}) => {
  const ret = useTranslationOrg(ns, options as any);
  const { i18n } = ret;
  useEffect(() => {
    if (lng && i18n.resolvedLanguage !== lng) {
      i18n.changeLanguage(lng);
    }
  }, [lng, i18n]);
  return ret;
};

export default useClientTranslation;
