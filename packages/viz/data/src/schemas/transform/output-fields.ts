import { ReducerOperationKind } from './constants';

/** reducer 输出字段及其在 operation 内的 schema path。 */
export type ReducerOutputField = {
  /** 输出字段名。 */
  field: string;
  /** 字段名在 reducer operation 内的路径。 */
  path: Array<string | number>;
};

/** 把 unknown 值收窄为可读取字段的普通对象。 */
const recordOf = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;

/** 列出 reducer operation 静态声明的输出字段及其 schema path。 */
export const reducerOutputFieldsOf = (operation: unknown): Array<ReducerOutputField> => {
  const record = recordOf(operation);
  if (record === undefined) return [];
  if (record.kind !== ReducerOperationKind.QuantileBand) {
    return typeof record.as === 'string' ? [{ field: record.as, path: ['as'] }] : [];
  }

  const outputs = recordOf(record.outputs);
  if (outputs === undefined) return [];
  const fields: Array<ReducerOutputField> = [];
  for (const key of ['lower', 'upper'] as const) {
    const field = outputs[key];
    if (typeof field === 'string') fields.push({ field, path: ['outputs', key] });
  }
  if (Array.isArray(outputs.points)) {
    outputs.points.forEach((point, pointIndex) => {
      const field = recordOf(point)?.as;
      if (typeof field === 'string') fields.push({ field, path: ['outputs', 'points', pointIndex, 'as'] });
    });
  }
  for (const key of [
    'spread',
    'lowerFence',
    'upperFence',
    'whiskerMin',
    'whiskerMax',
    'min',
    'max',
    'count',
  ] as const) {
    const field = outputs[key];
    if (typeof field === 'string') fields.push({ field, path: ['outputs', key] });
  }
  return fields;
};
