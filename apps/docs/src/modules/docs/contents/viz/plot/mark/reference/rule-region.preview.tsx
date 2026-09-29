import { Plot, PlotAxis, PointMark, ReferenceMark } from '@retikz/plot-react';

import { regionSamples } from './rule-region.data';

/** 图形参数 */
export type RuleRegionPreviewValues = {
  coordinate: 'cartesian2D' | 'polar2D';
  xStart: number;
  xEnd: number;
  yStart: number;
  yEnd: number;
};

/** 绘制示例图形 */
export const RuleRegionPreview = (values: RuleRegionPreviewValues) => (
  <Plot
    data={regionSamples}
    model={[
      { name: 'x', type: 'continuous' },
      { name: 'y', type: 'continuous' },
    ]}
    width={400}
    height={280}
    coordinate={values.coordinate === 'polar2D' ? 'polar2D' : undefined}
  >
    <ReferenceMark
      kind="region"
      x={values.xStart}
      xTo={values.xEnd}
      y={values.yStart}
      yTo={values.yEnd}
      color="#bfdbfe"
      fillOpacity={0.55}
    />
    <PointMark x="x" y="y" />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
  </Plot>
);
