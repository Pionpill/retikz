import { PlotSpecSchema } from '@retikz/plot';
import { renderPlot } from '@retikz/plot-vanilla';

import { waterfallRows } from './waterfall.data';
import { waterfallTransform } from './waterfall.definition';

const spec = PlotSpecSchema.parse({
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'changes' },
  transform: [{ kind: 'waterfall', field: 'delta', initialValue: 60 }],
  plotTheme: { palette: { categorical: ['#16a34a', '#dc2626'] } },
  scales: [
    { type: 'band', name: 'period', paddingInner: 0.2, paddingOuter: 0.08 },
    { type: 'linear', name: 'value', domain: [-20, 160], domainPadding: 0 },
  ],
  coordinate: { type: 'cartesian2D', x: 'period', y: 'value' },
  marks: [
    {
      type: 'interval',
      color: { kind: 'field', value: 'direction' },
      encoding: { x: { field: 'period' } },
      bounds: { y: { kind: 'extent', from: 'from', to: 'to' } },
    },
  ],
  guides: [
    { type: 'axis', dimension: 'x' },
    { type: 'axis', dimension: 'y', grid: true },
  ],
});

export const svg = renderPlot(
  spec,
  { changes: waterfallRows },
  {
    width: 420,
    height: 260,
    transformDefinitions: [waterfallTransform],
  },
);
