import type { Lang } from '@/i18n';
/** 处理阶段及其数据含义 */
export const figureI18n = {
  zh: [
    ['显式占位', '校验 start / span'],
    ['自动搜索', '按作者顺序'],
    ['补齐轨道', 'implicitRow / Column'],
    ['连续槽位', '包含内部 gap'],
  ],
  en: [
    ['Explicit areas', 'Validate start / span'],
    ['Find vacancies', 'Authored order'],
    ['Materialize tracks', 'Implicit definitions'],
    ['Build slots', 'Include internal gaps'],
  ],
} satisfies Record<Lang, Array<readonly [string, string]>>;
