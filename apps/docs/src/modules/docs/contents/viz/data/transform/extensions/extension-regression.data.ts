import type { IRDataSmoothTransform } from '@retikz/data';

/** 自定义拟合观测基线 */
export const originSamples = [
  { x: 1, y: 3 },
  { x: 2, y: 6 },
  { x: 3, y: 6 },
  { x: 4, y: 9 },
  { x: 5, y: 11 },
  { x: 6, y: 13 },
];
/** 观测偏移控件 */
export type ExtensionRegressionValues = { offset: number };
/** 偏移观测 y，拟合仍要求直线经过原点 */
export const originSamplesOf = (offset: number) => originSamples.map(row => ({ ...row, y: row.y + offset }));
/** 采样范围包含原点，便于观察自定义模型的约束 */
export const originOperation: IRDataSmoothTransform = {
  kind: 'smooth',
  params: {
    x: 'x',
    y: 'y',
    method: { kind: 'through-origin' },
    extent: [0, 6],
    sampleCount: 32,
    xAs: 'trendX',
    yAs: 'trendY',
  },
};
