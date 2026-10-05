import { RetikzPlotError } from '../../error';

/** 相对于有效轴长度的逐点外缘约束 */
export type MarkPaddingSample = {
  /** 基准 domain 下的归一化位置 */
  position: number;
  /** 朝 domain 起点的归一化外缘长度 */
  lower: number;
  /** 朝 domain 终点的归一化外缘长度 */
  upper: number;
};

/** 求解结果为两端相对于有效 range 长度的留白 */
export type MarkPaddingResolution = { lower: number; upper: number };

/** 在固定范围内有界收紧留白，始终保留通过所有外缘约束的可行解 */
export const solveMarkPadding = (
  samples: ReadonlyArray<MarkPaddingSample>,
  fixed: Partial<MarkPaddingResolution>,
  tolerance: number,
): MarkPaddingResolution => {
  const feasible = (sum: number): MarkPaddingResolution | undefined => {
    let lowerMinimum = fixed.lower ?? 0;
    let lowerMaximum = fixed.lower ?? sum;
    if (fixed.upper !== undefined) {
      lowerMinimum = Math.max(lowerMinimum, sum - fixed.upper);
      lowerMaximum = Math.min(lowerMaximum, sum - fixed.upper);
    }

    for (const sample of samples) {
      if (fixed.lower === undefined) {
        lowerMinimum = Math.max(lowerMinimum, sample.lower - sample.position * (1 - sum));
      }

      if (fixed.upper === undefined) {
        lowerMaximum = Math.min(lowerMaximum, 1 - sample.upper - sample.position * (1 - sum));
      }
    }

    if (lowerMinimum > lowerMaximum) return undefined;

    const lower = lowerMinimum + (lowerMaximum - lowerMinimum) / 2;
    const result = { lower, upper: sum - lower };

    // 对最终浮点表达式再验证，不能把压缩误差容限用作越界容限
    for (const sample of samples) {
      const position = result.lower + sample.position * (1 - result.lower - result.upper);
      if (fixed.lower === undefined && position < sample.lower) return undefined;
      if (fixed.upper === undefined && position > 1 - sample.upper) return undefined;
    }

    return result;
  };

  let minimum = (fixed.lower ?? 0) + (fixed.upper ?? 0);
  if (minimum >= 1) throw new RetikzPlotError('mark domainPadding has no feasible positive range');

  const initial = feasible(minimum);
  if (initial !== undefined) return initial;

  let maximum = 1 - 1e-12;
  let result = feasible(maximum);
  if (result === undefined) throw new RetikzPlotError('mark domainPadding has no feasible positive range');

  for (let pass = 0; pass < 32 && maximum - minimum > tolerance; pass += 1) {
    const middle = minimum + (maximum - minimum) / 2;
    const candidate = feasible(middle);
    if (candidate === undefined) minimum = middle;
    else {
      maximum = middle;
      result = candidate;
    }
  }

  return result;
};
