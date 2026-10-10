import { applyTransforms } from '@retikz/data';
import type { ExternalRow, IRDataTransform } from '@retikz/data';

/** 极值行示例的可写输入 */
export type SelectorExtremaValues = { grouped: boolean; method: string; tie: string; tail: number };
/** 用公开 IR 声明本节的宿主变换 */
export const selectorExtremaOperationOf = (values: SelectorExtremaValues): IRDataTransform => ({
  kind: 'select',
  params: {
    groupBy: values.grouped ? ['team'] : [],
    selector: {
      kind: values.method === 'min' ? 'min' : 'max',
      by: 'value',
      tie: values.tie === 'all' ? 'all' : values.tie === 'last' ? 'last' : 'first',
    },
    rankAs: 'rank',
  },
});

/** 每组默认包含两条并列最小值与最大值，a4 的收入可单独调整 */
export const selectorExtremaRowsOf = (values: SelectorExtremaValues): Array<ExternalRow> => [
  { team: 'A', item: 'a1', value: 10 },
  { team: 'A', item: 'a2', value: 10 },
  { team: 'A', item: 'a3', value: 90 },
  { team: 'A', item: 'a4', value: values.tail },
  { team: 'B', item: 'b1', value: 5 },
  { team: 'B', item: 'b2', value: 5 },
  { team: 'B', item: 'b3', value: 25 },
  { team: 'B', item: 'b4', value: 25 },
];

/** 执行选择变换，返回原始记录与排名字段 */
export const selectorExtremaResultOf = (values: SelectorExtremaValues): Array<ExternalRow> =>
  applyTransforms(selectorExtremaRowsOf(values), [selectorExtremaOperationOf(values)]);
