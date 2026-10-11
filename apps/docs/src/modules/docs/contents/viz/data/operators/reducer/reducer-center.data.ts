import { applyTransforms } from '@retikz/data';
import type { ExternalRow, IRDataTransform } from '@retikz/data';

import { operatorSamplesOf } from '../operator-samples.data';

/** 均值与中位数示例的可写输入 */
export type ReducerCenterValues = { grouped: boolean; method: string; tail: number };
/** 用公开 IR 声明本节的宿主变换 */
export const reducerCenterOperationOf = (values: ReducerCenterValues): IRDataTransform => ({
  kind: 'summarize',
  params: {
    groupBy: values.grouped ? ['team'] : [],
    metrics: [{ kind: values.method === 'median' ? 'median' : 'mean', field: 'value', as: 'center' }],
  },
});

/** 根据收入控件生成本节订单明细 */
export const reducerCenterRowsOf = (values: ReducerCenterValues): Array<ExternalRow> => operatorSamplesOf(values.tail);

/** 执行本节规约，返回真实汇总行 */
export const reducerCenterResultOf = (values: ReducerCenterValues): Array<ExternalRow> =>
  applyTransforms(reducerCenterRowsOf(values), [reducerCenterOperationOf(values)]).rows;
