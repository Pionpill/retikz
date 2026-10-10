import { applyTransforms } from '@retikz/data';
import type { ExternalRow, IRDataTransform } from '@retikz/data';

import { operatorSamplesOf } from '../operator-samples.data';

/** 指定位置示例的可写输入 */
export type SelectorNthValues = { grouped: boolean; order: string; index: number };
/** 用公开 IR 声明本节的宿主变换 */
export const selectorNthOperationOf = (values: SelectorNthValues): IRDataTransform => ({
  kind: 'select',
  params: {
    groupBy: values.grouped ? ['team'] : [],
    selector: {
      kind: 'nth',
      index: values.index,
      orderBy: [{ field: 'value', order: values.order === 'descending' ? 'descending' : 'ascending' }],
    },
    rankAs: 'rank',
  },
});

/** 生成本节的原始订单明细 */
export const selectorNthRowsOf = (_values: SelectorNthValues): Array<ExternalRow> => operatorSamplesOf();

/** 执行选择变换，返回原始记录与排名字段 */
export const selectorNthResultOf = (values: SelectorNthValues): Array<ExternalRow> =>
  applyTransforms(selectorNthRowsOf(values), [selectorNthOperationOf(values)]);
