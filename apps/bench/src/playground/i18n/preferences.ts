import type { ValueOf } from '@retikz/foundation';

/** Bench 支持的语言 */
export const Language = {
  Chinese: 'zh',
  English: 'en',
} as const;

/** Bench 支持的语言代码 */
export type LanguageValue = ValueOf<typeof Language>;

/** i18next 可用语言列表 */
export const supportedLanguages: ReadonlyArray<LanguageValue> = Object.values(Language);

/** 在 Bench 支持的语言之间循环 */
export const getNextLanguage = (language: LanguageValue): LanguageValue =>
  language === Language.Chinese ? Language.English : Language.Chinese;
