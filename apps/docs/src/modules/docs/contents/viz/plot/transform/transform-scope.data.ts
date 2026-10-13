import type { IRDataJitterTransform } from '@retikz/data';

/** 图形与结果表共用的扰动声明 */
export const scopeOperationOf = (values: { amount: number }): IRDataJitterTransform => ({
  kind: 'jitter',
  params: { axis: 'x', xField: 'x', amount: values.amount, seed: 7 },
});

/** 两层点共用的原始位置；纵坐标区分图层 */
export const scopeRows = [
  { x: 1, layerA: 1, layerB: 2 },
  { x: 2, layerA: 1, layerB: 2 },
  { x: 3, layerA: 1, layerB: 2 },
];
