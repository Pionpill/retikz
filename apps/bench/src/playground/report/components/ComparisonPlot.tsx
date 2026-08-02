import type { FC } from 'react';

import { Axis, IntervalMark, Plot, Scale } from '@retikz/plot-react';

import type { ComparisonChartRow } from '../view-model';

/** 策略对比 Plot 属性 */
export type ComparisonPlotProps = Readonly<{
  rows: ReadonlyArray<ComparisonChartRow>;
  width: number;
  height: number;
}>;

const policyColors = ['#93c5fd', '#3b82f6', '#1d4ed8'];

/** 使用 retikz Plot 绘制策略耗时柱状图 */
export const ComparisonPlot: FC<ComparisonPlotProps> = props => {
  const { rows, width, height } = props;
  return (
    <Plot
      data={[...rows]}
      model={[
        { name: 'policy', type: 'categorical' },
        { name: 'median', type: 'continuous' },
        { name: 'p95', type: 'continuous' },
      ]}
      width={width}
      height={height}
      colors={policyColors}
      renderer="svg"
      style={{ width: '100%', height: '100%', color: 'var(--muted-foreground)' }}
    >
      <IntervalMark x="policy" y="median" color="policy" fillOpacity={0.9} />
      <Scale
        dimension="x"
        type="band"
        paddingInner={rows.length === 1 ? 0.6 : 0.35}
        paddingOuter={rows.length === 1 ? 1 : 0.25}
      />
      <Axis dimension="x" />
      <Axis dimension="y" grid ticks={{ count: 4 }} />
    </Plot>
  );
};
