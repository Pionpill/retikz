import type { IRPlot } from '@retikz/plot';

import { renderPlot } from '@retikz/plot-vanilla';

import { grid } from './coordinate-custom-bridge.data';
import { bridgeCoordinate } from './coordinate-custom-bridge.definition';

const spec: IRPlot = {
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'grid' },
  scales: [
    { type: 'linear', name: 'x' },
    { type: 'linear', name: 'y' },
  ],
  coordinate: { type: 'bridge', archHeight: 60 },
  marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
  guides: [
    { type: 'axis', dimension: 'x' },
    { type: 'axis', dimension: 'y' },
  ],
};

export const svg = renderPlot(spec, { grid }, { width: 420, height: 220, coordinates: [bridgeCoordinate] });
