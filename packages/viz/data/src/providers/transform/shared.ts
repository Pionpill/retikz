import { isFiniteNumber } from '@retikz/math';

import type { ExternalRow } from '../../shared';
import { resolveFieldPath } from '../data';

/** transform 分组结果，保留分组键、成员行和回写到输出行的分组字段值 */
export type TransformRowGroup = {
  /** 由 groupBy 字段值序列化得到的稳定分组键 */
  key: string;
  /** 该分组包含的原始行，保持输入顺序 */
  rows: Array<ExternalRow>;
  /** groupBy 字段名到分组值的映射，会写回 summarize 输出行 */
  values: ExternalRow;
};

/** 生成分组 key；缺失值按 null 参与序列化，保证同组缺失值稳定合并 */
const groupKeyOf = (row: ExternalRow, fields: ReadonlyArray<string>): string =>
  JSON.stringify(fields.map(field => resolveFieldPath(row, field) ?? null));

/** 按字段列表逐层分组，每层保留父组内键值首次出现顺序，组内成员保持输入顺序 */
export const groupRowsByFields = (
  rows: Array<ExternalRow>,
  fields: ReadonlyArray<string> = [],
): Array<TransformRowGroup> => {
  if (fields.length === 0) return [{ key: '__all__', rows, values: {} }];

  const groups: Array<TransformRowGroup> = [];

  /** 按当前字段拆分父组，并按插入顺序展开下一层 */
  const appendGroups = (members: Array<ExternalRow>, fieldIndex: number): void => {
    if (fieldIndex === fields.length) {
      const row = members[0];
      const values: ExternalRow = {};

      for (const field of fields) values[field] = resolveFieldPath(row, field);
      groups.push({ key: groupKeyOf(row, fields), rows: members, values });
      return;
    }

    const partitions = new Map<string, Array<ExternalRow>>();
    const field = fields[fieldIndex];

    for (const row of members) {
      const key = JSON.stringify([resolveFieldPath(row, field) ?? null]);
      const partition = partitions.get(key);
      if (partition !== undefined) partition.push(row);
      else partitions.set(key, [row]);
    }

    for (const partition of partitions.values()) appendGroups(partition, fieldIndex + 1);
  };

  appendGroups(rows, 0);
  return groups;
};

/** 读取指定字段的有限数值序列，非数值、NaN 和无穷值会被跳过 */
export const finiteFieldValuesOf = (rows: Array<ExternalRow>, field: string): Array<number> => {
  const values: Array<number> = [];

  for (const row of rows) {
    const value = resolveFieldPath(row, field);
    if (isFiniteNumber(value)) values.push(value);
  }

  return values;
};

/** 在闭区间内生成包含两端点的等距采样位置 */
export const linearSamplesOf = (extent: readonly [number, number], sampleCount: number): Array<number> => {
  if (sampleCount === 2) return [extent[0], extent[1]];

  const step = (extent[1] - extent[0]) / (sampleCount - 1);

  return Array.from({ length: sampleCount }, (_, index) =>
    index === sampleCount - 1 ? extent[1] : extent[0] + step * index,
  );
};
