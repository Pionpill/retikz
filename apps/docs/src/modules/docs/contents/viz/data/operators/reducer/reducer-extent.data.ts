import { applyTransforms } from '@retikz/data';
import type { ExternalRow, IRDataTransform } from '@retikz/data';

import { operatorSamplesOf } from '../operator-samples.data';

/** 数值范围示例的可写输入 */
export type ReducerExtentValues = { grouped: boolean; tail: number };
/** 用公开 IR 声明本节的宿主变换 */
export const reducerExtentOperationOf = (values: ReducerExtentValues): IRDataTransform => ({
  kind: 'summarize',
  params: {
    groupBy: values.grouped ? ['team'] : [],
    metrics: [{ kind: 'extent', field: 'value', as: { min: 'min', max: 'max' } }],
  },
});

/** 根据收入控件生成本节订单明细 */
export const reducerExtentRowsOf = (values: ReducerExtentValues): Array<ExternalRow> => operatorSamplesOf(values.tail);

/** 执行本节规约，返回真实汇总行 */
export const reducerExtentResultOf = (values: ReducerExtentValues): Array<ExternalRow> =>
  applyTransforms(reducerExtentRowsOf(values), [reducerExtentOperationOf(values)]);
