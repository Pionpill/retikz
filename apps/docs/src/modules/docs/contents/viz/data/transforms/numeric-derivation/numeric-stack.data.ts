import { applyTransforms } from '@retikz/data';
import type { ExternalRow, IRDataStackTransform } from '@retikz/data';

import { numericRowsOf } from './numeric-derivation.data';

/** 本节控件对应的变换参数 */
export type NumericStackValues = { grouped: boolean; series: boolean; offset: string };
/** 计算与展示共用同一组输入 */
export const numericStackRowsOf = (): Array<ExternalRow> => {
  return numericRowsOf().map((row, index) => (index === 2 ? { ...row, value: -15 } : row));
};
/** 使用公开 kind / params 声明实际变换 */
export const numericStackOperationOf = (values: NumericStackValues): IRDataStackTransform => ({
  kind: 'stack',
  params: {
    x: values.grouped ? 'team' : undefined,
    y: 'value',
    groupBy: values.series ? 'item' : undefined,
    offset:
      values.offset === 'diverging'
        ? 'diverging'
        : values.offset === 'center'
          ? 'center'
          : values.offset === 'overlap'
            ? 'overlap'
            : 'zero',
  },
});
/** 执行当前控件对应的真实变换 */
export const numericStackResultOf = (values: NumericStackValues): Array<ExternalRow> =>
  applyTransforms(numericStackRowsOf(), [numericStackOperationOf(values)]).rows;
