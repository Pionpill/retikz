import { applyTransforms } from '@retikz/data';
import type { ExternalRow, IRDataDeriveIntervalTransform } from '@retikz/data';

import { numericRowsOf } from './numeric-derivation.data';

/** 本节控件对应的变换参数 */
export type NumericIntervalValues = { mode: string; baseline: number };
/** 计算与展示共用同一组输入 */
export const numericIntervalRowsOf = (): Array<ExternalRow> => {
  return numericRowsOf().map((row, index) => ({ team: row.team, low: (index + 1) * 2, value: row.value }));
};
/** 使用公开 kind / params 声明实际变换 */
export const numericIntervalOperationOf = (values: NumericIntervalValues): IRDataDeriveIntervalTransform => ({
  kind: 'derive-interval',
  params: {
    ...(values.mode === 'fields'
      ? { startFrom: 'low', endFrom: 'value' }
      : { from: 'value', baseline: values.baseline }),
  },
});
/** 执行当前控件对应的真实变换 */
export const numericIntervalResultOf = (values: NumericIntervalValues): Array<ExternalRow> =>
  applyTransforms(numericIntervalRowsOf(), [numericIntervalOperationOf(values)]).rows;
