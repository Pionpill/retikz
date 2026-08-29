import type { FC } from 'react';

import { IntervalMark, PathMark, Plot, PlotAxis } from '@retikz/plot-react';

import { quarterlyPerformance } from './cartesian-bar-line.data';

/** 同一 cartesian2D 坐标与比例尺叠加实际值柱形和目标值折线 */
const Demo: FC = () => (
  <Plot
    data={quarterlyPerformance}
    model={[
      { name: 'quarter', type: 'categorical' },
      { name: 'order', type: 'continuous' },
      { name: 'actual', type: 'continuous' },
      { name: 'target', type: 'continuous' },
    ]}
    width={560}
    height={220}
    plotTheme={{ palette: { series: ['#2563eb', '#f97316'] } }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <IntervalMark x="quarter" y="actual" fillOpacity={0.72} />
    <PathMark x="quarter" y="target" order="order" strokeWidth={3} zIndex={1} />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid ticks={{ count: 5 }} />
  </Plot>
);

export default Demo;
