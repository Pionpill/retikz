import { applyTransforms } from '@retikz/data';
import type { ExternalRow, IRDataJitterTransform } from '@retikz/data';

import { numericRowsOf } from './numeric-derivation.data';

/** 本节控件对应的变换参数 */
export type NumericJitterValues = { axis: string; amount: number; seed: number };
/** 计算与展示共用同一组输入 */
export const numericJitterRowsOf = (): Array<ExternalRow> => {
  return numericRowsOf().map((row, index) => ({ team: row.team, x: Math.floor(index / 2), y: row.value }));
};
/** 使用公开 kind / params 声明实际变换 */
export const numericJitterOperationOf = (values: NumericJitterValues): IRDataJitterTransform => ({
  kind: 'jitter',
  params: {
    axis: values.axis === 'both' ? 'both' : values.axis === 'y' ? 'y' : 'x',
    xField: 'x',
    yField: 'y',
    amount: values.amount,
    seed: values.seed,
  },
});
/** 执行当前控件对应的真实变换 */
export const numericJitterResultOf = (values: NumericJitterValues): Array<ExternalRow> =>
  applyTransforms(numericJitterRowsOf(), [numericJitterOperationOf(values)]).rows;
