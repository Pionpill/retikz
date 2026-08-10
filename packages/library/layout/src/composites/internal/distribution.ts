/** 可参与稳定加权分配的数值项 */
export type WeightedLayoutSize = Readonly<{
  base: number;
  min: number;
  max?: number;
  weight: number;
}>;

/** 加权分配后的数值与无法吸收的剩余空间 */
export type WeightedLayoutDistribution = Readonly<{
  values: ReadonlyArray<number>;
  remaining: number;
}>;

/** 计算有限数值之间用于布局收敛判断的统一相对 epsilon */
export const layoutEpsilon = (first: number, second: number): number => {
  if (!Number.isFinite(first) || !Number.isFinite(second)) {
    throw new Error('layoutEpsilon inputs must be finite');
  }
  return Math.max(1, Math.abs(first), Math.abs(second)) * Number.EPSILON * 64;
};

/** 按输入顺序执行 Neumaier compensated summation */
export const compensatedLayoutSum = (values: ReadonlyArray<number>): number => {
  let sum = 0;
  let compensation = 0;
  for (const value of values) {
    if (!Number.isFinite(value)) throw new Error('Layout sum values must be finite');
    const next = sum + value;
    if (!Number.isFinite(next)) throw new Error('Layout sum must remain finite');
    compensation += Math.abs(sum) >= Math.abs(value) ? sum - next + value : value - next + sum;
    if (!Number.isFinite(compensation)) throw new Error('Layout sum must remain finite');
    sum = next;
  }
  const result = sum + compensation;
  if (!Number.isFinite(result)) throw new Error('Layout sum must remain finite');
  return result;
};

/** 校验并首次钳制加权分配输入 */
const initialValueOf = (item: WeightedLayoutSize, index: number): number => {
  for (const [field, value] of [
    ['base', item.base],
    ['min', item.min],
    ['weight', item.weight],
  ] as const) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Weighted layout item ${index} ${field} must be finite and non-negative`);
    }
  }
  if (item.max !== undefined && (!Number.isFinite(item.max) || item.max < item.min)) {
    throw new Error(`Weighted layout item ${index} max must be finite and greater than or equal to min`);
  }
  return clampWeightedValue(item.base, item);
};

/** 把候选值钳到当前项的有限边界 */
const clampWeightedValue = (value: number, item: WeightedLayoutSize): number =>
  item.max === undefined ? Math.max(value, item.min) : Math.min(Math.max(value, item.min), item.max);

/** 判断当前数值是否仍可吸收指定方向的剩余空间 */
const canAccept = (item: WeightedLayoutSize, value: number, direction: 1 | -1): boolean =>
  direction > 0
    ? item.max === undefined || value < item.max - layoutEpsilon(value, item.max)
    : value > item.min + layoutEpsilon(value, item.min);

/** 按稳定 index 执行有界 weighted water-fill，并显式返回无法分配的 remainder */
export const distributeWeightedLayoutSizes = (
  items: ReadonlyArray<WeightedLayoutSize>,
  total: number,
): WeightedLayoutDistribution => {
  if (!Number.isFinite(total) || total < 0) throw new Error('Weighted layout total must be finite and non-negative');
  const values = items.map(initialValueOf);
  let remaining = total - compensatedLayoutSum(values);

  for (let round = 0; round <= items.length; round += 1) {
    if (Math.abs(remaining) <= layoutEpsilon(total, total - remaining)) break;
    const direction = remaining > 0 ? 1 : -1;
    const eligible = items
      .map((item, index) => ({ item, index }))
      .filter(({ item, index }) => item.weight > 0 && canAccept(item, values[index], direction));
    const weightSum = compensatedLayoutSum(eligible.map(({ item }) => item.weight));
    if (eligible.length === 0 || weightSum === 0) break;

    for (const { item, index } of eligible) {
      const proposed = values[index] + (remaining * item.weight) / weightSum;
      values[index] = clampWeightedValue(proposed, item);
    }
    remaining = total - compensatedLayoutSum(values);
  }

  if (remaining !== 0) {
    const direction = remaining > 0 ? 1 : -1;
    for (let index = items.length - 1; index >= 0; index -= 1) {
      const item = items[index];
      const proposed = values[index] + remaining;
      const withinLower = proposed >= item.min - layoutEpsilon(proposed, item.min);
      const withinUpper = item.max === undefined || proposed <= item.max + layoutEpsilon(proposed, item.max);
      if (item.weight > 0 && canAccept(item, values[index], direction) && withinLower && withinUpper) {
        values[index] = clampWeightedValue(proposed, item);
        remaining = total - compensatedLayoutSum(values);
        break;
      }
    }
  }

  if (Math.abs(remaining) <= layoutEpsilon(total, total - remaining)) remaining = 0;
  return Object.freeze({ values: Object.freeze(values), remaining });
};
