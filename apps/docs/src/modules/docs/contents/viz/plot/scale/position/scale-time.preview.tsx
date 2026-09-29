import { PathMark, Plot, PlotAxis, PointMark } from '@retikz/plot-react';

import { visits } from './scale-time.data';

/** temporal 字段让 x 位置通道自动派生时间比例尺 */
export const ScaleTimePreview = () => (
  <Plot
    data={visits}
    model={[
      { name: 'date', type: 'temporal' },
      { name: 'value', type: 'continuous' },
    ]}
    width={400}
    height={250}
  >
    <PathMark x="date" y="value" order="date" />
    <PointMark x="date" y="value" />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
  </Plot>
);
