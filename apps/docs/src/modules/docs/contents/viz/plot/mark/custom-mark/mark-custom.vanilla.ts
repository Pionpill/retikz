import type { IRPlot } from '@retikz/plot';

import { renderPlot } from '@retikz/plot-vanilla';

import { glyphRows } from './mark-custom.data';
import { diamondMark } from './mark-custom.definition';

const spec: IRPlot = {
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'glyphs' },
  coordinate: { type: 'cartesian2D', x: 'month', y: 'sales' },
  scales: [
    { type: 'linear', name: 'month' },
    { type: 'linear', name: 'sales' },
  ],
  marks: [
    {
      type: 'diamond',
      minimumSize: 16,
      fill: '#f59e0b',
      encoding: { x: { field: 'month' }, y: { field: 'sales' } },
    },
  ],
  guides: [
    { type: 'axis', dimension: 'x' },
    { type: 'axis', dimension: 'y', grid: true },
  ],
};

export const svg = renderPlot(
  spec,
  { glyphs: glyphRows },
  {
    width: 420,
    height: 260,
    markDefinitions: [diamondMark],
  },
);
