import type { Lang } from '@/i18n';

/** 外接 Provider 只支持 sort 时的模式对照 */
export const computationModesI18n: Record<Lang, Array<Array<[string, string]>>> = {
  zh: [
    [
      ['builtin', '全部本地'],
      ['本地汇总', 'summarize'],
      ['本地排序', 'sort'],
      ['返回结果', '计算完成'],
    ],
    [
      ['external', '全部要求外接'],
      ['外接不支持汇总', 'summarize: unsupported'],
      ['整链预检失败', '尚未开始计算'],
      ['请求终止', '汇总、排序均不执行'],
    ],
    [
      ['hybrid', '优先外接'],
      ['本地汇总', '外接不支持 summarize'],
      ['外接排序', '外接支持 sort'],
      ['返回结果', '计算完成'],
    ],
  ],
  en: [
    [
      ['builtin', 'All local'],
      ['Local summary', 'summarize'],
      ['Local sort', 'sort'],
      ['Return result', 'Complete'],
    ],
    [
      ['external', 'All external required'],
      ['Summary unsupported', 'summarize: unsupported'],
      ['Chain preflight fails', 'Before computation'],
      ['Request stops', 'Neither stage runs'],
    ],
    [
      ['hybrid', 'Prefer external'],
      ['Local summary', 'summarize unsupported'],
      ['External sort', 'sort supported'],
      ['Return result', 'Complete'],
    ],
  ],
};
