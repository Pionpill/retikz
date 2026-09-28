import type { Lang } from '@/i18n';
/** 处理阶段及其数据含义 */
export const figureI18n = {
  zh: [
    ['冻结轨道', '列与行边界'],
    ['最终测量', '子项精确或有界约束'],
    ['对齐与回放', '只选最终候选'],
    ['发布结果', 'Scene + artifact'],
  ],
  en: [
    ['Freeze tracks', 'Column / row boundaries'],
    ['Final measurement', 'Exact or bounded proposal'],
    ['Align and replay', 'Selected candidate only'],
    ['Publish', 'Scene + artifact'],
  ],
} satisfies Record<Lang, Array<readonly [string, string]>>;
