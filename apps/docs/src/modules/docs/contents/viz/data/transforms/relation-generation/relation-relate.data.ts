import { applyTransforms } from '@retikz/data';
import type { ExternalRow, IRDataRelateTransform } from '@retikz/data';

import { relationRowsOf } from './relation-generation.data';

/** 本节控件对应的变换参数 */
export type RelationRelateValues = { grouped: boolean; pair: string; measure: boolean };
/** 计算与展示共用同一组输入 */
export const relationRelateRowsOf = (): Array<ExternalRow> => {
  return relationRowsOf();
};
/** 使用公开 kind / params 声明实际变换 */
export const relationRelateOperationOf = (values: RelationRelateValues): IRDataRelateTransform => ({
  kind: 'relate',
  params: {
    groupBy: values.grouped ? ['team'] : [],
    source: {
      selector: values.pair === 'ends' ? { kind: 'first' } : { kind: 'min', by: 'value', tie: 'first' },
      fields: { id: 'record' },
    },
    target: {
      selector: values.pair === 'ends' ? { kind: 'last' } : { kind: 'max', by: 'value', tie: 'first' },
      fields: { id: 'record' },
    },
    measures: values.measure ? [{ op: 'difference', field: 'value', as: 'delta' }] : undefined,
  },
});
/** 执行当前控件对应的真实变换 */
export const relationRelateResultOf = (values: RelationRelateValues): Array<ExternalRow> =>
  applyTransforms(relationRelateRowsOf(), [relationRelateOperationOf(values)]).rows;
