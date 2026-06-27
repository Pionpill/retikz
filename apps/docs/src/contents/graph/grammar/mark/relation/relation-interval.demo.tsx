import type { FC } from 'react';
import { Axis, IntervalMark, Plot, PointMark, RelationMark } from '@retikz/plot-react';

import { intervalRelations } from './relation-interval.data';

const Demo: FC = () => (
  <Plot data={intervalRelations} width={620} height={320} style={{ maxWidth: '100%', height: 'auto' }}>
    <Axis dimension="x" tickLabels={false} />
    <Axis dimension="y" grid tickCount={4} />
    <IntervalMark x="slot" y="value" color="phase" stroke="#ffffff" strokeWidth={0.8} />
    <PointMark
      x="slot"
      y="labelY"
      text="label"
      textColor="#ffffff"
      font={{ size: 10, weight: 'bold' }}
      align="center"
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
      via={[{ project: { x: 'sourceX', y: 'sourceViaY' } }]}
      target={{ project: { x: 'targetX', y: 'targetY' } }}
      routing={{ kind: 'orthogonal', via: '-|', labelStep: 'main' }}
      label={{ text: { field: 'deltaLabel' }, position: 0.5, side: 'sloped', textColor: '#7f1d1d', font: { size: 10, weight: 'bold' } }}
      path={{ arrow: '->', color: '#b91c1c', dashPattern: [5, 4], strokeWidth: 1.1 }}
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
      via={[{ project: { x: 'sourceX', y: 'sourceViaY' } }]}
      target={{ project: { x: 'targetX', y: 'targetY' } }}
      routing={{ kind: 'orthogonal', via: '-|', labelStep: 'main' }}
      label={{ text: { field: 'deltaLabel' }, position: 0.5, side: 'sloped', textColor: '#166534', font: { size: 10, weight: 'bold' } }}
      path={{ arrow: '->', color: '#15803d', dashPattern: [5, 4], strokeWidth: 1.1 }}
    />
  </Plot>
);

export default Demo;
