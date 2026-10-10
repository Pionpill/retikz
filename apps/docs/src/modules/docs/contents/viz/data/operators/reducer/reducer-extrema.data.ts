import { applyTransforms } from '@retikz/data';
import type { ExternalRow, IRDataTransform } from '@retikz/data';

import { operatorSamplesOf } from '../operator-samples.data';

/** 最小值与最大值示例的可写输入 */
export type ReducerExtremaValues = { grouped: boolean; method: string; tail: number };
/** 用公开 IR 声明本节的宿主变换 */
export const reducerExtremaOperationOf = (values: ReducerExtremaValues): IRDataTransform => ({
  kind: 'summarize',
  params: {
    groupBy: values.grouped ? ['team'] : [],
    metrics: [{ kind: values.method === 'max' ? 'max' : 'min', field: 'value', as: 'extreme' }],
  },
});

/** 根据收入控件生成本节订单明细 */
export const reducerExtremaRowsOf = (values: ReducerExtremaValues): Array<ExternalRow> =>
  operatorSamplesOf(values.tail);

/** 执行本节规约，返回真实汇总行 */
export const reducerExtremaResultOf = (values: ReducerExtremaValues): Array<ExternalRow> =>
  applyTransforms(reducerExtremaRowsOf(values), [reducerExtremaOperationOf(values)]);
