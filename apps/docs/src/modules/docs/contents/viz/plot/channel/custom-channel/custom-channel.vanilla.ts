import { PlotSchema } from '@retikz/plot';
import { renderPlot } from '@retikz/plot-vanilla';

import { customChannelPoints } from './custom-channel.data';
import { intensityChannel } from './custom-channel.definition';

const spec = PlotSchema.parse({
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'points' },
  scales: [
    { type: 'linear', name: 'x', domainPadding: 16 },
    { type: 'linear', name: 'y', domainPadding: 16 },
  ],
  coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
  marks: [
    {
      type: 'point',
      size: { kind: 'constant', value: 8 },
      color: { kind: 'constant', value: '#2563eb' },
      encoding: { x: { field: 'x' }, y: { field: 'y' }, channels: { intensity: { field: 'score' } } },
    },
  ],
  guides: [
    { type: 'axis', dimension: 'x' },
    { type: 'axis', dimension: 'y', grid: true },
    { type: 'legend', channel: 'intensity' },
  ],
});

export const svg = renderPlot(
  spec,
  { points: customChannelPoints },
  { layout: { width: 440, height: 260 }, definitions: { channels: [intensityChannel] } },
);
