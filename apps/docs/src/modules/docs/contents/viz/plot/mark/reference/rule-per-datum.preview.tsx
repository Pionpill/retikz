import { Plot, PlotAxis, PlotLegend, ReferenceMark } from '@retikz/plot-react';

import { thresholds } from './rule-per-datum.data';

/** 图形参数 */
export type RulePerDatumPreviewValues = {
  offset: number;
  coordinate: 'cartesian2D' | 'polar2D';
};

/** 绘制示例图形 */
export const RulePerDatumPreview = (values: RulePerDatumPreviewValues) => {
  const data = thresholds.map(row => ({
    ...row,
    threshold: Number(row.threshold) + values.offset,
  }));

  return (
    <Plot
      data={data}
      model={[
        { name: 'tier', type: 'categorical' },
        { name: 'threshold', type: 'continuous' },
      ]}
      width={400}
      height={280}
      coordinate={values.coordinate === 'polar2D' ? 'polar2D' : undefined}
    >
      <ReferenceMark y="threshold" color="tier" />
      <PlotAxis dimension="y" grid />
      <PlotLegend channel="color" />
    </Plot>
  );
};
