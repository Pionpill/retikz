import { Plot, PlotAxis, PlotLegend, PlotScale, PointMark, ReferenceMark } from '@retikz/plot-react';

import { referenceSpans } from './rule-extent.data';

/** 图形参数 */
export type RuleExtentPreviewValues = {
  inset: number;
  coordinate: 'cartesian2D' | 'polar2D';
};

/** 绘制示例图形 */
export const RuleExtentPreview = (values: RuleExtentPreviewValues) => {
  const inset = values.inset;
  const data = referenceSpans.map(row => ({
    ...row,
    spanStart: Number(row.spanStart) + inset,
    spanEnd: Number(row.spanEnd) - inset,
  }));

  return (
    <Plot
      data={data}
      model={[
        { name: 'tier', type: 'categorical' },
        { name: 'threshold', type: 'continuous' },
        { name: 'spanStart', type: 'continuous' },
        { name: 'spanEnd', type: 'continuous' },
      ]}
      width={400}
      height={280}
      coordinate={values.coordinate === 'polar2D' ? 'polar2D' : undefined}
    >
      <PlotScale dimension="x" type="linear" domain={[0, 120]} />
      <PlotScale dimension="y" type="linear" domain={[15, 95]} />
      <ReferenceMark y="threshold" extentField="spanStart" extentToField="spanEnd" color="tier" strokeWidth={2} />
      <PointMark x="spanStart" y="threshold" color="tier" minimumSize={6} />
      <PointMark x="spanEnd" y="threshold" color="tier" minimumSize={6} />
      <PlotAxis dimension="x" grid />
      <PlotAxis dimension="y" />
      <PlotLegend channel="color" />
    </Plot>
  );
};
