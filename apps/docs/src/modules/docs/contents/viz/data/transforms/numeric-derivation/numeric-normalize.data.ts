import { applyTransforms } from '@retikz/data';
import type { ExternalRow, IRDataNormalizeTransform } from '@retikz/data';

import { numericRowsOf, groupFieldsOf } from './numeric-derivation.data';

/** 本节控件对应的变换参数 */
export type NumericNormalizeValues = { group: string; basis: string; overwrite: boolean };
/** 计算与展示共用同一组输入 */
export const numericNormalizeRowsOf = (): Array<ExternalRow> => {
  return numericRowsOf();
};
/** 使用公开 kind / params 声明实际变换 */
export const numericNormalizeOperationOf = (values: NumericNormalizeValues): IRDataNormalizeTransform => ({
  kind: 'normalize',
  params: {
    field: 'value',
    groupBy: groupFieldsOf(values.group).length > 0 ? groupFieldsOf(values.group) : undefined,
    basis: values.basis === 'percent' ? 'percent' : 'fraction',
    as: values.overwrite ? undefined : 'share',
  },
});
/** 执行当前控件对应的真实变换 */
export const numericNormalizeResultOf = (values: NumericNormalizeValues): Array<ExternalRow> =>
  applyTransforms(numericNormalizeRowsOf(), [numericNormalizeOperationOf(values)]).rows;
