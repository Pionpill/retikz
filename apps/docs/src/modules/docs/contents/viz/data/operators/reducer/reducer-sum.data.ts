import { applyTransforms } from '@retikz/data';
import type { ExternalRow, IRDataTransform } from '@retikz/data';

import { operatorSamplesOf } from '../operator-samples.data';

/** 求和示例的可写输入 */
export type ReducerSumValues = { grouped: boolean; tail: number };
/** 用公开 IR 声明本节的宿主变换 */
export const reducerSumOperationOf = (values: ReducerSumValues): IRDataTransform => ({
  kind: 'summarize',
  params: { groupBy: values.grouped ? ['team'] : [], metrics: [{ kind: 'sum', field: 'value', as: 'total' }] },
});

/** 根据收入控件生成本节订单明细 */
export const reducerSumRowsOf = (values: ReducerSumValues): Array<ExternalRow> => operatorSamplesOf(values.tail);

/** 执行本节规约，返回真实汇总行 */
export const reducerSumResultOf = (values: ReducerSumValues): Array<ExternalRow> =>
  applyTransforms(reducerSumRowsOf(values), [reducerSumOperationOf(values)]);
