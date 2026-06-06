import { type ExternalRow, PlotTransform, type SortTransform, type StackTransform, type Transform } from '../ir';
import { compareByPath, isFiniteNumber, resolveFieldPath } from './field';
import { inferCategoryDomain } from './scale';

/** 默认堆叠下 / 上界输出字段名（与 IntervalMark 的 y0Field / y1Field 默认对齐） */
const DEFAULT_START_FIELD = 'y0';
const DEFAULT_END_FIELD = 'y1';

/** 稳定排序：按字段升 / 降序（等键保持原序，JS Array.sort 稳定） */
const applySort = (rows: Array<ExternalRow>, op: SortTransform): Array<ExternalRow> => {
  const direction = op.order === 'descending' ? -1 : 1;
  return [...rows].sort((a, b) => direction * compareByPath(a, b, op.field));
};

/**
 * 堆叠：每个 x 分组内按系列顺序累加 y，给每行派生 [y0, y1]
 * @description 系列顺序 = groupBy 值的全局出现顺序（保序去重）；缺 y / 非有限按 0 计入（零高段、不跳过，避免后续累加错位）。
 *   输出保持输入行顺序，只追加 startField / endField 两字段。
 *   x 缺省 → 全行归一组（单链累积，喂饼图）；groupBy 缺省 → 按数据序累加（不重排组内）。
 */
const applyStack = (rows: Array<ExternalRow>, op: StackTransform): Array<ExternalRow> => {
  const startField = op.startField ?? DEFAULT_START_FIELD;
  const endField = op.endField ?? DEFAULT_END_FIELD;
  // groupBy 缺省：组内保持数据序（rankOf 恒等价 → 不重排）；有 groupBy：按系列全局出现序累加。
  const groupByField = op.groupBy;
  const seriesOrder = groupByField === undefined ? [] : inferCategoryDomain(rows.map(row => resolveFieldPath(row, groupByField)));
  const seriesRank = new Map(seriesOrder.map((series, index) => [series, index] as const));
  const rankOf = (row: ExternalRow): number => {
    if (groupByField === undefined) return 0;
    const series = resolveFieldPath(row, groupByField);
    if (typeof series !== 'string' && typeof series !== 'number') return seriesOrder.length;
    return seriesRank.get(series) ?? seriesOrder.length;
  };

  // 按 x 分组（x 值为 string | number 标量，Map 按值索引）；x 缺省 → 全行单链（同一固定 key）
  const groups = new Map<unknown, Array<ExternalRow>>();
  const SINGLE_CHAIN_KEY = Symbol('single-chain');
  for (const row of rows) {
    const key = op.x === undefined ? SINGLE_CHAIN_KEY : resolveFieldPath(row, op.x);
    const bucket = groups.get(key);
    if (bucket) bucket.push(row);
    else groups.set(key, [row]);
  }

  // 每组内按系列序累加（稳定排序保留数据序），记录每行的 [y0, y1]
  const bounds = new Map<ExternalRow, [number, number]>();
  for (const groupRows of groups.values()) {
    const ordered = [...groupRows].sort((a, b) => rankOf(a) - rankOf(b));
    let cumulative = 0;
    for (const row of ordered) {
      const value = resolveFieldPath(row, op.y);
      const segment = isFiniteNumber(value) ? value : 0;
      const y0 = cumulative;
      const y1 = cumulative + segment;
      cumulative = y1;
      bounds.set(row, [y0, y1]);
    }
  }

  return rows.map(row => {
    const [y0, y1] = bounds.get(row) ?? [0, 0];
    return { ...row, [startField]: y0, [endField]: y1 };
  });
};

/**
 * 按声明顺序折叠应用一串 transform（rows → rows）
 * @description 纯函数：每个 op 行进行→行出（stack 仅追加标量字段），数据值不进 IR。空 / 省略 → 原样返回。
 */
export const applyTransforms = (rows: Array<ExternalRow>, ops?: Array<Transform>): Array<ExternalRow> => {
  if (!ops || ops.length === 0) return rows;
  return ops.reduce((acc, op) => {
    switch (op.kind) {
      case PlotTransform.Sort:
        return applySort(acc, op);
      case PlotTransform.Stack:
        return applyStack(acc, op);
    }
  }, rows);
};
