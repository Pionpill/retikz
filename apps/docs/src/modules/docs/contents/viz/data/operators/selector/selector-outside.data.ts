import { applyTransforms } from '@retikz/data';
import type { ExternalRow, IRDataTransform } from '@retikz/data';

import { operatorSamplesOf } from '../operator-samples.data';

/** 分位区间外的行示例的可写输入 */
export type SelectorOutsideValues = {
  grouped: boolean;
  lowerP: number;
  upperP: number;
  boundary: string;
  factor: number;
  tail: number;
};
/** 用公开 IR 声明本节的宿主变换 */
export const selectorOutsideOperationOf = (values: SelectorOutsideValues): IRDataTransform => ({
  kind: 'select',
  params: {
    groupBy: values.grouped ? ['team'] : [],
    selector: {
      kind: 'outside-quantile-band',
      field: 'value',
      lowerP: values.lowerP,
      upperP: values.upperP,
      boundary: values.boundary === 'band' ? { kind: 'band' } : { kind: 'spread', factor: values.factor },
    },
    rankAs: 'rank',
  },
});

/** 生成本节的原始订单明细 */
export const selectorOutsideRowsOf = (values: SelectorOutsideValues): Array<ExternalRow> =>
  operatorSamplesOf(values.tail);

/** 执行选择变换，返回原始记录与排名字段 */
export const selectorOutsideResultOf = (values: SelectorOutsideValues): Array<ExternalRow> =>
  applyTransforms(selectorOutsideRowsOf(values), [selectorOutsideOperationOf(values)]);
