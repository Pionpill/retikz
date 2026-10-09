import type { Lang } from '@/i18n';

/** 同一例子在当前阶段的具体状态 */
export const transformModelI18n: Record<Lang, Array<Array<[string, string]>>> = {
  zh: [
    [
      ['输入模型', 'team · item · value'],
      ['汇总后的模型', 'team · total · count'],
      ['排序后的模型', 'team · total · count'],
    ],
  ],
  en: [
    [
      ['Input model', 'team · item · value'],
      ['After summary', 'team · total · count'],
      ['After sorting', 'team · total · count'],
    ],
  ],
};
