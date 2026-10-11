import type { BuiltinReducerOperationKind, ExternalRow } from '@retikz/data';
import { isFiniteNumber } from '@retikz/math';

/** 标记订单示例中支持统计结果的原始行；排序统计的并列端点全部标记 */
export const reducerSourceRowIndicesOf = (
  rows: Array<ExternalRow>,
  grouped: boolean,
  operation: BuiltinReducerOperationKind,
  p: number = 0.5,
): Array<number> => {
  if (operation === 'count') return rows.map((_, index) => index);

  const groups = new Map<unknown, Array<{ index: number; value: number }>>();
  rows.forEach((row, index) => {
    if (!isFiniteNumber(row.value)) return;
    const key = grouped ? row.team : null;
    const entries = groups.get(key) ?? [];
    entries.push({ index, value: row.value });
    groups.set(key, entries);
  });

  const highlighted = new Set<number>();
  for (const entries of groups.values()) {
    if (operation === 'sum' || operation === 'mean' || operation === 'quantile-band') {
      // 分位区间示例还输出有效值计数，因此每个有效值都参与结果
      entries.forEach(entry => highlighted.add(entry.index));
      continue;
    }

    entries.sort((a, b) => a.value - b.value);
    const last = entries.length - 1;
    const position = last * (operation === 'quantile' ? p : 0.5);
    const positions =
      operation === 'min'
        ? [0]
        : operation === 'max'
          ? [last]
          : operation === 'extent'
            ? [0, last]
            : [Math.floor(position), Math.ceil(position)];
    const endpointValues = new Set(positions.map(index => entries[index].value));
    entries.forEach(entry => {
      if (endpointValues.has(entry.value)) highlighted.add(entry.index);
    });
  }
  return rows.flatMap((_, index) => (highlighted.has(index) ? [index] : []));
};
