import type { IRPlot } from '@retikz/plot';
import { Plot } from '@retikz/plot-react';

import { scaleCustomRows } from './scale-custom.data';
import { brandColorScale, easePositionScale } from './scale-custom.definition';

/** 图形参数 */
export type ScaleCustomPreviewValues = {
  exponent: number;
};

/** 绘制示例图形 */
export const ScaleCustomPreview = (values: ScaleCustomPreviewValues) => {
  // 自定义 scale 不参与 React 自动派生：经完整 spec 的 scales 引用，definition 走 scaleDefinitions 注入。
  const spec: IRPlot = {
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'pts' },
    scales: [
      { type: 'ease-position', name: 'x', exponent: values.exponent },
      { type: 'linear', name: 'y' },
      { type: 'brand', name: 'tier-color' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [
      {
        type: 'point',
        size: { kind: 'constant', value: 7 },
        color: { kind: 'field', value: 'tier', scale: 'tier-color' },
        encoding: { x: { field: 'x' }, y: { field: 'y' } },
      },
    ],
    guides: [
      { type: 'axis', dimension: 'x' },
      { type: 'axis', dimension: 'y', grid: true },
      { type: 'legend', channel: 'color' },
    ],
  };

  return (
    <Plot
      spec={spec}
      data={{ pts: scaleCustomRows }}
      scaleDefinitions={[easePositionScale, brandColorScale]}
      width={420}
      height={220}
    />
  );
};
