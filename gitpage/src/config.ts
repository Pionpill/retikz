export const localeMap = {
  zh: '中文',
  en: '英文',
};

export const locales = Object.keys(localeMap);
export type localeTypes = keyof typeof localeMap;
export const defaultLocale = 'zh';
