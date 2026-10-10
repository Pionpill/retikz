import { applyTransforms } from '@retikz/data';
import type { ExternalRow, IRDataTransform } from '@retikz/data';

import { operatorSamplesOf } from '../operator-samples.data';

/** 首行与末行示例的可写输入 */
export type SelectorEndsValues = { grouped: boolean; method: string; order: string };
/** 用公开 IR 声明本节的宿主变换 */
export const selectorEndsOperationOf = (values: SelectorEndsValues): IRDataTransform => ({
  kind: 'select',
  params: {
    groupBy: values.grouped ? ['team'] : [],
    selector: {
      kind: values.method === 'last' ? 'last' : 'first',
      ...(values.order === 'input'
        ? {}
        : { orderBy: [{ field: 'value', order: values.order === 'descending' ? 'descending' : 'ascending' }] }),
    },
    rankAs: 'rank',
  },
});

/** 生成本节的原始订单明细 */
export const selectorEndsRowsOf = (_values: SelectorEndsValues): Array<ExternalRow> => operatorSamplesOf();

/** 执行选择变换，返回原始记录与排名字段 */
export const selectorEndsResultOf = (values: SelectorEndsValues): Array<ExternalRow> =>
  applyTransforms(selectorEndsRowsOf(values), [selectorEndsOperationOf(values)]);
