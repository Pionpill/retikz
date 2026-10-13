import type { IRDataNormalizeTransform } from '@retikz/data';

/** 图形与结果表共用的归一化声明 */
export const entryOperation: IRDataNormalizeTransform = {
  kind: 'normalize',
  params: { field: 'value', as: 'share' },
};

/** 归一化接入示例的输入行 */
export const entryRows = [
  { month: 1, value: 20 },
  { month: 2, value: 30 },
  { month: 3, value: 50 },
];
