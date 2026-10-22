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
    <PathMark encodings={{ order: 'date', position: { x: { field: 'date' }, y: { field: 'value' } } }} />
    <PointMark encodings={{ position: { x: { field: 'date' }, y: { field: 'value' } } }} />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
  </Plot>
);
