import type { GridLatticeOptions, GridLatticeValue } from './types';

/** 按 origin-relative 整数索引枚举闭区间内的格点，并按需补足未命中的边界 */
export const enumerateGridLattice = ({
  min,
  max,
  spacing,
  origin,
  includeBoundary,
}: GridLatticeOptions): Array<GridLatticeValue> => {
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
