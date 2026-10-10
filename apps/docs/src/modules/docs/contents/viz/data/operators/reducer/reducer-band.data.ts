import { applyTransforms } from '@retikz/data';
import type { ExternalRow, IRDataTransform } from '@retikz/data';

import { operatorSamplesOf } from '../operator-samples.data';

/** 分位区间示例的可写输入 */
export type ReducerBandValues = {
  grouped: boolean;
  lowerP: number;
  upperP: number;
  whisker: string;
  factor: number;
  tail: number;
};
/** 用公开 IR 声明本节的宿主变换 */
export const reducerBandOperationOf = (values: ReducerBandValues): IRDataTransform => ({
  kind: 'summarize',
  params: {
    groupBy: values.grouped ? ['team'] : [],
    metrics: [
      {
        kind: 'quantile-band',
        field: 'value',
        lowerP: values.lowerP,
        upperP: values.upperP,
        outputs: {
          lower: 'lower',
          upper: 'upper',
          points: [{ p: 0.5, as: 'median' }],
          count: 'count',
          ...(values.whisker === 'none' ? {} : { whiskerMin: 'lo', whiskerMax: 'hi' }),
        },
        ...(values.whisker === 'none'
          ? {}
          : { whisker: values.whisker === 'minMax' ? { kind: 'minMax' } : { kind: 'spread', factor: values.factor } }),
      },
    ],
  },
});

/** 根据收入控件生成本节订单明细 */
export const reducerBandRowsOf = (values: ReducerBandValues): Array<ExternalRow> => operatorSamplesOf(values.tail);

/** 执行本节规约，返回真实汇总行 */
export const reducerBandResultOf = (values: ReducerBandValues): Array<ExternalRow> =>
  applyTransforms(reducerBandRowsOf(values), [reducerBandOperationOf(values)]);
