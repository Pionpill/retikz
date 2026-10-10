import type { Lang } from '@/i18n';

/** 共用观测与三条算子路径的标签 */
export const statisticsOverviewI18n: Record<
  Lang,
  {
    input: [string, string];
    output: [string, string];
    branches: Array<Array<[string, string]>>;
  }
> = {
  zh: {
    input: ['宿主提供分组', '(x,y): (1,10), (3,30)'],
    output: ['宿主组织结果', '按变换语义输出行'],
    branches: [
      [
        ['Selector 选行', 'max(y)'],
        ['返回原始行', 'y: 30 的行引用'],
      ],
      [
        ['Reducer 归约', 'sum(y)'],
        ['返回字段片段', '{ total: 40 }'],
      ],
      [
        ['Regression 拟合', 'linear(x,y)'],
        ['返回预测模型', 'predict(x) = 10x'],
      ],
    ],
  },
  en: {
    input: ['Host supplies group', '(x,y): (1,10), (3,30)'],
    output: ['Host assembles', 'Output rows per transform'],
    branches: [
      [
        ['Selector selects', 'max(y)'],
        ['Returns source row', 'Row with y: 30'],
      ],
      [
        ['Reducer reduces', 'sum(y)'],
        ['Returns fields', '{ total: 40 }'],
      ],
      [
        ['Regression fits', 'linear(x,y)'],
        ['Returns model', 'predict(x) = 10x'],
      ],
    ],
  },
};
