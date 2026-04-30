import 'i18next';
import type { Resources } from './locales/zh';

/**
 * i18next 类型增强：把资源结构注入到 TypeScript，
 * 这样 useTranslation().t('sections.api') 这类调用能在 IDE 里得到 key 自动补全 + 拼写校验。
 *
 * defaultNS 设为 'translation'（init 时同样使用这个 ns），
 * 调用 t(...) 时不需要前缀。
 */
declare module 'i18next' {
  // eslint-disable-next-line no-unused-vars
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: Resources };
  }
}
