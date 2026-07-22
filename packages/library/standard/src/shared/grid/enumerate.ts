import type { GridLatticeOptions, GridLatticeValue } from './types';

/** 单轴 lowering 允许生成的最大格点数 */
export const MAX_GRID_LATTICE_VALUES_PER_AXIS = 10_000;

/** 返回格点索引或输出规模违反确定性 lowering 上限时的错误信息 */
export const getGridLatticeRangeError = ({ min, max, spacing, origin }: GridLatticeOptions): string | undefined => {
  const firstIndex = Math.ceil((min - origin) / spacing);
  const lastIndex = Math.floor((max - origin) / spacing);

  if (firstIndex > lastIndex) return undefined;
  if (!Number.isSafeInteger(firstIndex) || !Number.isSafeInteger(lastIndex)) {
    return 'Grid lattice indices must be finite safe integers.';
  }

  const count = lastIndex - firstIndex + 1;
  if (!Number.isSafeInteger(count) || count > MAX_GRID_LATTICE_VALUES_PER_AXIS) {
    return `Grid lattice enumeration exceeds ${MAX_GRID_LATTICE_VALUES_PER_AXIS} values per axis.`;
  }
  return undefined;
};

/** 按 origin-relative 整数索引枚举闭区间内的格点，并按需补足未命中的边界 */
export const enumerateGridLattice = (options: GridLatticeOptions): Array<GridLatticeValue> => {
  const { min, max, spacing, origin, includeBoundary } = options;
  const rangeError = getGridLatticeRangeError(options);
  if (rangeError !== undefined) throw new RangeError(rangeError);

  const firstIndex = Math.ceil((min - origin) / spacing);
  const lastIndex = Math.floor((max - origin) / spacing);
  const values: Array<GridLatticeValue> = [];

  for (let index = firstIndex; index <= lastIndex; index += 1) {
    values.push({ value: origin + index * spacing, index });
  }

  if (!includeBoundary) return values;

  const withBoundary = [...values];
  addBoundaryIfMissing(withBoundary, min);
  addBoundaryIfMissing(withBoundary, max);
  return withBoundary.sort((left, right) => left.value - right.value);
};

/** 判断值是否是当前 Grid major 周期中的主线 */
export const isGridMajorLine = (
  lattice: GridLatticeValue,
  major: { every: number; offset: number } | undefined,
): boolean => {
  if (major === undefined || lattice.index === undefined) return false;
  return (((lattice.index - major.offset) % major.every) + major.every) % major.every === 0;
};

const addBoundaryIfMissing = (values: Array<GridLatticeValue>, boundary: number): void => {
  if (values.some(item => Math.abs(item.value - boundary) <= Number.EPSILON * 16)) return;
  values.push({ value: boundary });
};
