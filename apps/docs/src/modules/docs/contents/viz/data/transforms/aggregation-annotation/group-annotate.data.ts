import { applyTransforms } from '@retikz/data';
import type { ExternalRow, IRDataAnnotateTransform } from '@retikz/data';

import { groupRowsOf, groupFieldsOf } from './aggregation-annotation.data';

/** 本节控件对应的变换参数 */
export type GroupAnnotateValues = { group: string; mode: string };
/** 计算与展示共用同一组输入 */
export const groupAnnotateRowsOf = (): Array<ExternalRow> => {
  return groupRowsOf();
};
/** 使用公开 kind / params 声明实际变换 */
export const groupAnnotateOperationOf = (values: GroupAnnotateValues): IRDataAnnotateTransform => ({
  kind: 'annotate',
  params: {
    groupBy: groupFieldsOf(values.group),
    ...(values.mode === 'selector'
      ? { selectors: [{ selector: { kind: 'max', by: 'value', tie: 'first' }, as: 'peak' }] }
      : { metrics: [{ kind: 'sum', field: 'value', as: 'total' }] }),
  },
});
/** 执行当前控件对应的真实变换 */
export const groupAnnotateResultOf = (values: GroupAnnotateValues): Array<ExternalRow> =>
  applyTransforms(groupAnnotateRowsOf(), [groupAnnotateOperationOf(values)]).rows;
