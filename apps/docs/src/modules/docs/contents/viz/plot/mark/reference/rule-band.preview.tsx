import { Plot, PlotAxis, PlotScale, PointMark, ReferenceMark } from '@retikz/plot-react';

import { scores } from './rule-threshold.data';

/** 图形参数 */
export type RuleBandPreviewValues = {
  coordinate: 'cartesian2D' | 'polar2D';
  axis: 'y' | 'x';
  start: number;
  end: number;
};

/** 绘制示例图形 */
export const RuleBandPreview = (values: RuleBandPreviewValues) => (
  <Plot
    data={scores}
    model={[
      { name: 'attempt', type: 'continuous' },
      { name: 'score', type: 'continuous' },
    ]}
    width={400}
    height={280}
    coordinate={values.coordinate === 'polar2D' ? 'polar2D' : undefined}
  >
    <PlotScale dimension="x" type="linear" domain={[0, 120]} />
    <PlotScale dimension="y" type="linear" domain={[0, 100]} />
    {values.axis === 'x' ? (
      <ReferenceMark x={values.start} xTo={values.end} color="#fde68a" />
    ) : (
      <ReferenceMark y={values.start} yTo={values.end} color="#fde68a" />
    )}
    <PointMark x="attempt" y="score" />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
  </Plot>
);
