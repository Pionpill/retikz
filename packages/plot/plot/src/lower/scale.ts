/** 归一化求值函数：数据值 → 坐标值 */
export type LinearScaleFn = (value: number) => number;

/** 线性映射 domain→range；d0=d1 时取区间中点防除零 */
const linear =
  (domain: readonly [number, number], range: readonly [number, number]): LinearScaleFn =>
  (value: number): number => {
    const [d0, d1] = domain;
    const [r0, r1] = range;
    return d1 === d0 ? (r0 + r1) / 2 : r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);
  };

/** 从一组数值求 [min, max]；空集回退 [0, 1] */
const extent = (values: Array<number>): [number, number] =>
  values.length === 0 ? [0, 1] : [Math.min(...values), Math.max(...values)];

/**
 * 建轴的线性归一化函数
 * @description domain 缺省时从绑定数据值推断（extent）；range 缺省时用 fallback（由坐标系尺寸给）
 */
export const resolveLinearScale = (
  def: { domain?: readonly [number, number]; range?: readonly [number, number] },
  values: Array<number>,
  fallbackRange: readonly [number, number],
): LinearScaleFn => linear(def.domain ?? extent(values), def.range ?? fallbackRange);
