import { applyTransforms } from '@retikz/data';
import type { ExternalRow, IRDataSummarizeTransform } from '@retikz/data';

import { groupRowsOf, groupFieldsOf } from './aggregation-annotation.data';

/** 本节控件对应的变换参数 */
export type GroupSummarizeValues = { group: string; metric: string };
/** 计算与展示共用同一组输入 */
export const groupSummarizeRowsOf = (): Array<ExternalRow> => {
  return groupRowsOf();
};
/** 使用公开 kind / params 声明实际变换 */
export const groupSummarizeOperationOf = (values: GroupSummarizeValues): IRDataSummarizeTransform => ({
  kind: 'summarize',
  params: {
    groupBy: groupFieldsOf(values.group),
    metrics: [
      values.metric === 'count'
        ? { kind: 'count', as: 'stat' }
        : { kind: values.metric === 'mean' ? 'mean' : 'sum', field: 'value', as: 'stat' },
    ],
  },
});
/** 执行当前控件对应的真实变换 */
export const groupSummarizeResultOf = (values: GroupSummarizeValues): Array<ExternalRow> =>
  applyTransforms(groupSummarizeRowsOf(), [groupSummarizeOperationOf(values)]).rows;
