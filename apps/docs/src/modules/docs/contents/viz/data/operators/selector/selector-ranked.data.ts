import { applyTransforms } from '@retikz/data';
import type { ExternalRow, IRDataTransform } from '@retikz/data';

import { operatorSamplesOf } from '../operator-samples.data';

/** 最高与最低 N 行示例的可写输入 */
export type SelectorRankedValues = { grouped: boolean; method: string; n: number; tie: string };
/** 用公开 IR 声明本节的宿主变换 */
export const selectorRankedOperationOf = (values: SelectorRankedValues): IRDataTransform => ({
  kind: 'select',
  params: {
    groupBy: values.grouped ? ['team'] : [],
    selector: {
      kind: values.method === 'bottom' ? 'bottom' : 'top',
      by: 'value',
      n: values.n,
      tie: values.tie === 'all' ? 'all' : values.tie === 'last' ? 'last' : 'first',
    },
    rankAs: 'rank',
  },
});

/** 生成本节的原始订单明细 */
export const selectorRankedRowsOf = (_values: SelectorRankedValues): Array<ExternalRow> => operatorSamplesOf();

/** 执行选择变换，返回原始记录与排名字段 */
export const selectorRankedResultOf = (values: SelectorRankedValues): Array<ExternalRow> =>
  applyTransforms(selectorRankedRowsOf(values), [selectorRankedOperationOf(values)]).rows;
