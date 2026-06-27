import { defineNodeChannel } from '@retikz/plot';
import { Axis, Legend, Plot, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

const points = [
  { x: 0, y: 2.2, score: 10 },
  { x: 1, y: 3.8, score: 42 },
  { x: 2, y: 2.9, score: 70 },
  { x: 3, y: 4.6, score: 96 },
];

type ExtensionChannelBinding = { field?: string; value?: unknown };

const extensionChannelsOf = (mark: {
  encoding?: { channels?: Partial<Record<string, ExtensionChannelBinding>> };
}): Partial<Record<string, ExtensionChannelBinding>> => mark.encoding?.channels ?? {};

const intensity = defineNodeChannel<number>({
  channel: 'intensity',
  output: { outputKind: 'number', range: [0.3, 1], clamp: true },
  legend: 'ramp',
  resolve: ctx => mark => {
    const binding = extensionChannelsOf(mark).intensity;
    if (binding?.field === undefined) return undefined;
    const field = binding.field;
    const values = ctx.rows.map(row => Number(row[field])).filter(Number.isFinite);
    if (values.length === 0) return undefined;
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const map = (value: number): number => 0.3 + (hi === lo ? 0.5 : (value - lo) / (hi - lo)) * 0.7;

    return {
      resolver: row => {
        const value = Number(row[field]);
        return Number.isFinite(value) ? map(value) : undefined;
      },
      descriptor: {
        channel: 'intensity',
        scaleType: 'linear',
        domain: [lo, hi],
        range: [0.3, 1],
        field,
        fieldType: ctx.fieldTypes.get(field),
      },
    };
  },
  deliver: (node, value) => {
    node.opacity = value;
  },
});

const Demo: FC = () => (
  <Plot data={points} channelDefinitions={[intensity]} width={440} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <PointMark x="x" y="y" size={8} fill="#2563eb" stroke="#1d4ed8" channels={{ intensity: 'score' }} />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
    <Legend channel="intensity" />
  </Plot>
);

export default Demo;
