import { PlotFieldType } from '@retikz/plot';
import { Axis, Legend, PathMark, Plot, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

const rows = [
  { month: 1, value: 12, segment: 'A', volume: 18 },
  { month: 2, value: 18, segment: 'A', volume: 28 },
  { month: 3, value: 15, segment: 'A', volume: 22 },
  { month: 4, value: 24, segment: 'A', volume: 34 },
  { month: 1, value: 8, segment: 'B', volume: 14 },
  { month: 2, value: 12, segment: 'B', volume: 20 },
  { month: 3, value: 17, segment: 'B', volume: 26 },
  { month: 4, value: 20, segment: 'B', volume: 30 },
];

const Demo: FC = () => (
  <Plot
    data={rows}
    model={[
      { name: 'month', type: PlotFieldType.Continuous },
      { name: 'value', type: PlotFieldType.Continuous },
      { name: 'segment', type: PlotFieldType.Categorical },
      { name: 'volume', type: PlotFieldType.Continuous },
    ]}
    width={440}
    height={280}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PathMark x="month" y="value" order="month" series="segment" color="segment" strokeWidth={3} lineCap="round" opacity={0.7} />
    <PointMark x="month" y="value" color="segment" size="volume" shape="segment" stroke="#1f2937" strokeWidth={0.8} />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
    <Legend channel="color" position="bottom" />
  </Plot>
);

export default Demo;
