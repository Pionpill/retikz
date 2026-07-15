import type { IRPlotSpec } from '@retikz/plot';
import type { FC } from 'react';

import { Plot } from '@retikz/plot-react';

import { revenue } from './plot-cartesian.data';

const spec: IRPlotSpec = {
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'revenue' },
  scales: [
    { type: 'band', name: 'quarter' },
    { type: 'linear', name: 'value' },
  ],
  coordinate: { type: 'cartesian2D', x: 'quarter', y: 'value' },
  marks: [{ type: 'interval', encoding: { x: { field: 'quarter' }, y: { field: 'value' } } }],
  guides: [
    { type: 'axis', dimension: 'x' },
    { type: 'axis', dimension: 'y', grid: true },
  ],
};

const Demo: FC = () => (
  <Plot spec={spec} data={{ revenue }} width={360} height={220} style={{ maxWidth: '100%', height: 'auto' }} />
);

export default Demo;
