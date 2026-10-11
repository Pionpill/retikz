import type { Lang } from '@/i18n';

/** 同一例子在当前阶段的具体状态 */
export const transformResultI18n: Record<Lang, Array<Array<[string, string]>>> = {
  zh: [
    [
      ['预期输出', 'total：数值'],
      ['实际返回', 'A.total = 40'],
      ['值域符合预期', '交给后续排序'],
    ],
    [
      ['预期输出', 'total：数值'],
      ['实际返回', 'A.total = "forty"'],
      ['值域不符', '终止，不执行排序'],
    ],
  ],
  en: [
    [
      ['Expected output', 'total: numeric'],
      ['Actual result', 'A.total = 40'],
      ['Value is valid', 'Continue to sort'],
    ],
    [
      ['Expected output', 'total: numeric'],
      ['Actual result', 'A.total = "forty"'],
      ['Value is invalid', 'Stop before sorting'],
    ],
  ],
};
