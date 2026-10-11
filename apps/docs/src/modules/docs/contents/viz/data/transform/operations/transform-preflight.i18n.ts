import type { Lang } from '@/i18n';

/** 同一例子在当前阶段的具体状态 */
export const transformPreflightI18n: Record<Lang, Array<Array<[string, string]>>> = {
  zh: [
    [
      ['匹配汇总实现', 'summarize ✓'],
      ['匹配排序实现', 'sort ✓'],
      ['预检通过', '开始汇总 → 排序'],
    ],
    [
      ['匹配汇总实现', 'summarize ✓'],
      ['排序实现缺失', 'sort ✗'],
      ['预检失败', '汇总也不会开始'],
    ],
  ],
  en: [
    [
      ['Summary available', 'summarize ✓'],
      ['Sort available', 'sort ✓'],
      ['Preflight passes', 'Run summary → sort'],
    ],
    [
      ['Summary available', 'summarize ✓'],
      ['Sort unavailable', 'sort ✗'],
      ['Preflight fails', 'No summary runs'],
    ],
  ],
};
