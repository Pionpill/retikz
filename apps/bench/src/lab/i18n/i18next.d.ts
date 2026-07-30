import 'i18next';

import type { I18nResources } from './locales';

declare module 'i18next' {
  export interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: I18nResources;
  }
}
