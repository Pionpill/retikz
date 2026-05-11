import 'i18next';
import type { I18nResources } from './locales/zh';

/**
 * i18next 类型增强：把资源结构注入到 TypeScript
 * @description 让 `t('sections.api')` 在 IDE 里有 key 自动补全 + 拼写校验；defaultNS 与 init 一致设为 'translation'，调用 t() 不需要前缀
 */
declare module 'i18next' {
  // eslint-disable-next-line no-unused-vars
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: I18nResources };
  }
}
