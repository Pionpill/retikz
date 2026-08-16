import type { IRPlot } from '@retikz/plot';

import { renderPlot } from '@retikz/plot-vanilla';

import { scaleCustomRows } from './scale-custom.data';
import { brandColorScale, easePositionScale } from './scale-custom.definition';

const spec: IRPlot = {
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'points' },
  scales: [
    { type: 'ease-position', name: 'x', exponent: 1.8 },
    { type: 'linear', name: 'y' },
    { type: 'brand', name: 'tier-color' },
  ],
  coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
  marks: [
    {
      type: 'point',
      size: { kind: 'constant', value: 7 },
      color: { kind: 'field', value: 'tier', scale: 'tier-color' },
      encoding: { x: { field: 'x' }, y: { field: 'y' } },
    },
  ],
  guides: [
    { type: 'axis', dimension: 'x' },
    { type: 'axis', dimension: 'y', grid: true },
    { type: 'legend', channel: 'color' },
  ],
};

export const svg = renderPlot(
  spec,
  { points: scaleCustomRows },
  {
    width: 420,
    height: 260,
    scaleDefinitions: [easePositionScale, brandColorScale],
  },
);
