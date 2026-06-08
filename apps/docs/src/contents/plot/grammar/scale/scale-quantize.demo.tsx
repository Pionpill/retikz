import { Plot } from '@retikz/plot-react';
import type { PlotSpec } from '@retikz/plot';
import type { FC } from 'react';

import { stations } from './scale-discretization.data';

/** quantize 5 档：连续 density 经 spec 入口显式离散化 color scale，等宽切 5 段、每档一色（blues 采样） */
const spec: PlotSpec = {
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'd' },
  scales: [
    { type: 'linear', name: 'x' },
    { type: 'linear', name: 'y' },
    { type: 'quantize', name: 'col', domain: [0, 100], count: 5, scheme: 'blues' },
  ],
  coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
  marks: [{ type: 'point', encoding: { x: { field: 'lng' }, y: { field: 'lat' }, color: { field: 'density', scale: 'col' } } }],
  guides: [
    { type: 'axis', dimension: 'x' },
    { type: 'axis', dimension: 'y' },
  ],
};

const Demo: FC = () => <Plot spec={spec} data={{ d: stations }} width={360} height={240} style={{ maxWidth: '100%', height: 'auto' }} />;

export default Demo;
