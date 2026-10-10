import type { IRDataSmoothTransform } from '@retikz/data';
import { BuiltinRegressionMethod } from '@retikz/data';

/** 两组拟合试验共用的正值观测 */
export const regressionSamples = [
  { x: 1, y: 2 },
  { x: 2, y: 3 },
  { x: 3, y: 4 },
  { x: 4, y: 4 },
  { x: 5, y: 6 },
  { x: 6, y: 10 },
  { x: 7, y: 16 },
  { x: 8, y: 21 },
  { x: 9, y: 33 },
];

/** 拟合方法与宿主采样控件 */
export type RegressionValues = { method: string; order: number; sampleCount: number; tail: number };

/** 仅调整末次观测，保持其余点和坐标范围不变 */
export const regressionSamplesOf = (tail: number) =>
  regressionSamples.map(row => ({ ...row, y: row.x === 9 ? tail : row.y }));

/** 拟合方法声明放在 smooth 的 method 内，采样参数由宿主管理 */
export const regressionOperationOf = (values: RegressionValues): IRDataSmoothTransform => ({
  kind: 'smooth',
  params: {
    x: 'x',
    y: 'y',
    xAs: 'trendX',
    yAs: 'trendY',
    sampleCount: values.sampleCount,
    method:
      values.method === BuiltinRegressionMethod.Polynomial
        ? { kind: BuiltinRegressionMethod.Polynomial, order: values.order }
        : { kind: values.method },
  },
});
