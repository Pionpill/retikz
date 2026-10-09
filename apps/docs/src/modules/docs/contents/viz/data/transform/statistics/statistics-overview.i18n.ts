import type { Lang } from '@/i18n';

/** 共用输入输出与两条算子路径的标签 */
export const statisticsOverviewI18n: Record<
  Lang,
  {
    input: [string, string];
    output: [string, string];
    branches: Array<Array<[string, string]>>;
  }
> = {
  zh: {
    input: ['宿主提供分组', 'value: 10, 30'],
    output: ['宿主组织结果', '按变换语义输出行'],
    branches: [
      [
        ['Reducer 归约', 'sum(value)'],
        ['返回字段片段', '{ total: 40 }'],
      ],
      [
        ['Selector 选行', 'max(value)'],
        ['返回原始行', 'value: 30 的行引用'],
      ],
    ],
  },
  en: {
    input: ['Host supplies group', 'value: 10, 30'],
    output: ['Host assembles', 'Output rows per transform'],
    branches: [
      [
        ['Reducer reduces', 'sum(value)'],
        ['Returns fields', '{ total: 40 }'],
      ],
      [
        ['Selector selects', 'max(value)'],
        ['Returns source row', 'Row with value: 30'],
      ],
    ],
  },
};
