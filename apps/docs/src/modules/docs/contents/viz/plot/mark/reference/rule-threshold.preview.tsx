import { Plot, PlotAxis, BuiltinPlotScale, PointMark, ReferenceMark } from '@retikz/plot-react';

import { scores } from './rule-threshold.data';

/** 图形参数 */
export type RuleThresholdPreviewValues = {
  coordinate: 'cartesian2D' | 'polar2D';
  axis: 'y' | 'x';
  value: number;
};

/** 绘制示例图形 */
export const RuleThresholdPreview = (values: RuleThresholdPreviewValues) => (
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
    <BuiltinPlotScale dimension="x" type="linear" domain={[0, 120]} />
    <BuiltinPlotScale dimension="y" type="linear" domain={[0, 100]} />
    <PointMark x="attempt" y="score" />
    {values.axis === 'x' ? (
      <ReferenceMark x={values.value} color="crimson" />
    ) : (
      <ReferenceMark y={values.value} color="crimson" />
    )}
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
  </Plot>
);
