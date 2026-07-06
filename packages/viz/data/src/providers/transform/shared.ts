import { isFiniteNumber } from '@retikz/math';

import type { ExternalRow } from '../../schemas';

import { resolveFieldPath } from '../data';

/** transform 分组结果，保留分组键、成员行和回写到输出行的分组字段值。 */
export type TransformRowGroup = {
  key: string;
  rows: Array<ExternalRow>;
  values: ExternalRow;
};

const groupKeyOf = (row: ExternalRow, fields: ReadonlyArray<string>): string =>
  JSON.stringify(fields.map(field => resolveFieldPath(row, field) ?? null));

/** 按字段路径对行分组，并保持首次出现的分组顺序。 */
export const groupRowsByFields = (
  rows: Array<ExternalRow>,
  fields: ReadonlyArray<string> = [],
): Array<TransformRowGroup> => {
  if (fields.length === 0) return [{ key: '__all__', rows, values: {} }];
  const groups = new Map<string, TransformRowGroup>();
  for (const row of rows) {
    const key = groupKeyOf(row, fields);
    const found = groups.get(key);
    if (found !== undefined) {
      found.rows.push(row);
      continue;
    }
    const values: ExternalRow = {};
    for (const field of fields) values[field] = resolveFieldPath(row, field);
    groups.set(key, { key, rows: [row], values });
  }
  return [...groups.values()];
};

/** 读取指定字段的有限数值序列，非数值、NaN 和无穷值会被跳过。 */
export const finiteFieldValuesOf = (rows: Array<ExternalRow>, field: string): Array<number> => {
  const values: Array<number> = [];
  for (const row of rows) {
    const value = resolveFieldPath(row, field);
    if (isFiniteNumber(value)) values.push(value);
  }
  return values;
};

/** 在闭区间内生成包含两端点的等距采样位置。 */
export const linearSamplesOf = (extent: readonly [number, number], sampleCount: number): Array<number> => {
  if (sampleCount === 2) return [extent[0], extent[1]];
  const step = (extent[1] - extent[0]) / (sampleCount - 1);
  return Array.from({ length: sampleCount }, (_, index) =>
    index === sampleCount - 1 ? extent[1] : extent[0] + step * index,
  );
};
