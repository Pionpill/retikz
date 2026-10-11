import { applyTransforms } from '@retikz/data';
import type { ExternalRow, IRDataTransform } from '@retikz/data';

import { operatorSamplesOf } from '../operator-samples.data';

/** 分位数示例的可写输入 */
export type ReducerQuantileValues = { grouped: boolean; p: number; tail: number };
/** 用公开 IR 声明本节的宿主变换 */
export const reducerQuantileOperationOf = (values: ReducerQuantileValues): IRDataTransform => ({
  kind: 'summarize',
  params: {
    groupBy: values.grouped ? ['team'] : [],
    metrics: [{ kind: 'quantile', field: 'value', p: values.p, as: 'quantile' }],
  },
});

/** 根据收入控件生成本节订单明细 */
export const reducerQuantileRowsOf = (values: ReducerQuantileValues): Array<ExternalRow> =>
  operatorSamplesOf(values.tail);

/** 执行本节规约，返回真实汇总行 */
export const reducerQuantileResultOf = (values: ReducerQuantileValues): Array<ExternalRow> =>
  applyTransforms(reducerQuantileRowsOf(values), [reducerQuantileOperationOf(values)]).rows;
