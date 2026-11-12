import { RetikzDataError } from '../../error';
import type { RegressionModel, RegressionPair } from './contract';

/** 原始因变量空间中的样本内拟合优度 */
export type RegressionScore = Readonly<{
  /** 决定系数；常量响应时未定义 */
  rSquared: number | null;
  /** 同一批观测的均方误差 */
  meanSquaredError: number;
}>;

/** 以补偿求和减少累计舍入误差 */
const compensatedSum = (values: ReadonlyArray<number>): number => {
  let sum = 0;
  let correction = 0;
  for (const value of values) {
    const adjusted = value - correction;
    const next = sum + adjusted;
    correction = next - sum - adjusted;
    sum = next;
  }
  return sum;
};

/** 在原始观测位置评价模型，不使用绘制采样点或丢弃观测 */
export const evaluateRegression = (pairs: ReadonlyArray<RegressionPair>, model: RegressionModel): RegressionScore => {
  if (pairs.length < 2) throw new RetikzDataError('data: regression evaluation requires at least two observations');
  let scale = 0;
  const predictions = pairs.map(pair => {
    let prediction: number;
    try {
      prediction = model.predict(pair.x);
    } catch (cause) {
      if (cause instanceof RetikzDataError) throw cause;
      throw new RetikzDataError('data: regression evaluation failed', { cause });
    }
    if (!Number.isFinite(prediction))
      throw new RetikzDataError('data: regression evaluation produced a non-finite prediction');
    scale = Math.max(scale, Math.abs(pair.y), Math.abs(prediction));
    return prediction;
  });
  if (scale === 0) return { rSquared: null, meanSquaredError: 0 };
  const mean = compensatedSum(pairs.map(pair => pair.y / scale)) / pairs.length;
  const residual = compensatedSum(pairs.map((pair, index) => (pair.y / scale - predictions[index] / scale) ** 2));
  const total = compensatedSum(pairs.map(pair => (pair.y / scale - mean) ** 2));
  const meanSquaredError =
    compensatedSum(pairs.map((pair, index) => (pair.y - predictions[index]) ** 2)) / pairs.length;
  const constant = pairs.every(pair => pair.y === pairs[0].y);
  const rSquared = constant ? null : 1 - residual / total;
  if (!Number.isFinite(meanSquaredError) || (rSquared !== null && !Number.isFinite(rSquared)))
    throw new RetikzDataError('data: regression evaluation produced a non-finite score');
  return { rSquared, meanSquaredError };
};
