import type { FC } from 'react';

import { Axis, PathMark, Plot, PointMark, RelationMark } from '@retikz/plot-react';

import { monthlyTrend } from './transform-relate.data';

const Demo: FC = () => (
  <Plot data={monthlyTrend} width={520} height={300} style={{ maxWidth: '100%', height: 'auto' }}>
    <PathMark
      x="month"
      y="value"
      order="month"
      stroke="#0f766e"
      strokeWidth={2.2}
      anchorId={{ prefix: 'trend', field: 'id' }}
    />
    <PointMark x="month" y="value" fill="#ffffff" stroke="#0f766e" strokeWidth={1.2} size={5} />
    <RelationMark
      transform={[
        {
          kind: 'relate',
          source: { selector: { op: 'min', by: 'value' }, fields: { id: 'id' } },
          target: { selector: { op: 'max', by: 'value' }, fields: { id: 'id' } },
          measures: [{ op: 'difference', field: 'value', as: 'delta', labelAs: 'deltaLabel', labelPrefix: '+' }],
        },
      ]}
      source={{ anchorId: { prefix: 'trend', field: 'sourceId' } }}
      target={{ anchorId: { prefix: 'trend', field: 'targetId' } }}
      style={{
        color: { kind: 'constant', value: '#f97316' },
        strokeWidth: { kind: 'constant', value: 1.6 },
      }}
      path={{
        routing: { kind: 'bend', bendDirection: 'left', bendAngle: 28 },
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
