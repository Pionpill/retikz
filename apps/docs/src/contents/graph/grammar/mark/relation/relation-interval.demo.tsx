import type { FC } from 'react';
import { Axis, IntervalMark, Plot, RelationMark } from '@retikz/plot-react';

import { intervalRelations } from './relation-interval.data';

const Demo: FC = () => (
  <Plot data={intervalRelations} width={620} height={320} style={{ maxWidth: '100%', height: 'auto' }}>
    <Axis dimension="x" tickLabels={false} />
    <Axis dimension="y" grid tickCount={4} />
    <IntervalMark
      x="slot"
      y="value"
      color="phase"
      stroke="#ffffff"
      strokeWidth={0.8}
      label="label"
      labelPosition="above"
      labelDistance={4}
      labelTextColor="#0f172a"
      labelFont={{ size: 10, weight: 'bold' }}
    />
    <RelationMark
      transform={[
        {
          kind: 'relate',
          groupBy: ['pair'],
          source: { selector: { op: 'min', by: 'decreaseOrder' }, fields: { x: 'slot', y: 'value', viaY: 'routeY' } },
          target: { selector: { op: 'max', by: 'decreaseOrder' }, fields: { x: 'slot', y: 'value' } },
          measures: [{ op: 'difference', field: 'value', as: 'delta', labelAs: 'deltaLabel', labelPrefix: '+' }],
        },
      ]}
      source={{ project: { x: 'sourceX', y: 'sourceY' } }}
      target={{ project: { x: 'targetX', y: 'targetY' } }}
      style={{
        color: { kind: 'constant', value: '#b91c1c' },
        strokeWidth: { kind: 'constant', value: 1.1 },
      }}
      path={{
        via: [{ project: { x: 'sourceX', y: 'sourceViaY' } }],
        routing: { kind: 'orthogonal', via: '-|', labelStep: 'main' },
        label: { text: { field: 'deltaLabel' }, position: 0.5, side: 'sloped', textColor: '#7f1d1d', font: { size: 10, weight: 'bold' } },
        options: { arrow: '->', dashPattern: [5, 4] },
      }}
    />
    <RelationMark
      transform={[
        {
          kind: 'relate',
          groupBy: ['pair'],
          source: { selector: { op: 'min', by: 'increaseOrder' }, fields: { x: 'slot', y: 'value', viaY: 'routeY' } },
          target: { selector: { op: 'max', by: 'increaseOrder' }, fields: { x: 'slot', y: 'value' } },
          measures: [{ op: 'difference', field: 'value', as: 'delta', labelAs: 'deltaLabel', labelPrefix: '+' }],
        },
      ]}
      source={{ project: { x: 'sourceX', y: 'sourceY' } }}
      target={{ project: { x: 'targetX', y: 'targetY' } }}
      style={{
        color: { kind: 'constant', value: '#15803d' },
        strokeWidth: { kind: 'constant', value: 1.1 },
      }}
      path={{
        via: [{ project: { x: 'sourceX', y: 'sourceViaY' } }],
        routing: { kind: 'orthogonal', via: '-|', labelStep: 'main' },
        label: { text: { field: 'deltaLabel' }, position: 0.5, side: 'sloped', textColor: '#166534', font: { size: 10, weight: 'bold' } },
        options: { arrow: '->', dashPattern: [5, 4] },
      }}
    />
  </Plot>
);

export default Demo;
