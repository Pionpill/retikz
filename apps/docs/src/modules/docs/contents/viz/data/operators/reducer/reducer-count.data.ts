import { applyTransforms } from '@retikz/data';
import type { ExternalRow, IRDataTransform } from '@retikz/data';

/** 计数示例的可写输入 */
export type ReducerCountValues = { grouped: boolean };
/** 用公开 IR 声明本节的宿主变换 */
export const reducerCountOperationOf = (values: ReducerCountValues): IRDataTransform => ({
  kind: 'summarize',
  params: { groupBy: values.grouped ? ['team'] : [], metrics: [{ kind: 'count', as: 'count' }] },
});

/** 计数示例的订单明细 */
export const reducerCountRows: Array<ExternalRow> = [
  { team: 'A', item: 'a1', value: 10 },
  { team: 'A', item: 'a2', value: 20 },
  { team: 'A', item: 'a3', value: 20 },
  { team: 'A', item: 'a4', value: 90 },
  { team: 'B', item: 'b1', value: 5 },
  { team: 'B', item: 'b2', value: 15 },
  { team: 'B', item: 'b3', value: 15 },
  { team: 'B', item: 'b4', value: 25 },
];

/** 执行计数变换，返回每组或全部订单的行数 */
export const reducerCountResultOf = (values: ReducerCountValues): Array<ExternalRow> =>
  applyTransforms(reducerCountRows, [reducerCountOperationOf(values)]).rows;
