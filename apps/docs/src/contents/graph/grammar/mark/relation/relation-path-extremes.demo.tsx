import type { FC } from 'react';

import { Axis, PathMark, Plot, PointMark, RelationMark } from '@retikz/plot-react';

import { pathExtremeRelations } from './relation-path-extremes.data';

const Demo: FC = () => (
  <Plot data={pathExtremeRelations} width={620} height={320} style={{ maxWidth: '100%', height: 'auto' }}>
    <PathMark
      x="x"
      y="y"
      order="order"
      stroke="#0f766e"
      strokeWidth={2.2}
      anchorId={{ prefix: 'trend', field: 'id' }}
    />
    <PointMark x="x" y="y" fill="#ffffff" stroke="#0f766e" strokeWidth={1} size={4.5} />
    <RelationMark
      transform={[
        {
          kind: 'relate',
          source: { selector: { op: 'min', by: 'y' }, fields: { id: 'id' } },
          target: { selector: { op: 'max', by: 'y' }, fields: { id: 'id' } },
          measures: [{ op: 'difference', field: 'y', as: 'delta', labelAs: 'deltaLabel', labelPrefix: '+' }],
        },
      ]}
      source={{ anchorId: { prefix: 'trend', field: 'sourceId' } }}
      target={{ anchorId: { prefix: 'trend', field: 'targetId' } }}
      style={{
        color: { kind: 'constant', value: '#f97316' },
        strokeWidth: { kind: 'constant', value: 1.6 },
      }}
      path={{
        routing: { kind: 'bend', bendDirection: 'left', bendAngle: 32 },
        label: {
          text: { field: 'deltaLabel' },
          position: 0.5,
          side: 'sloped',
          textColor: '#ea580c',
          font: { size: 11, weight: 'bold' },
        },
        options: { marks: [{ pos: 1, mark: { kind: 'arrow' } }] },
      }}
    />
    <Axis dimension="x" grid />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
