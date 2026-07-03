import type { FC } from 'react';

import { Axis, Plot, PointMark, RelationMark } from '@retikz/plot-react';

import { bubbleNodes } from './relation-bubble.data';

const Demo: FC = () => (
  <Plot data={bubbleNodes} width={620} height={320} style={{ maxWidth: '100%', height: 'auto' }}>
    <PointMark
      x="x"
      y="y"
      size="value"
      color="segment"
      anchorId={{ prefix: 'bubble', field: 'id' }}
      label="label"
      labelPosition="top"
      fillOpacity={0.68}
      stroke="#0f172a"
      strokeWidth={0.8}
    />
    <RelationMark
      transform={[
        {
          kind: 'relate',
          source: { selector: { op: 'max', by: 'value' }, fields: { id: 'id' } },
          target: { selector: { op: 'max', by: 'y' }, fields: { id: 'id' } },
          measures: [{ op: 'difference', field: 'y', as: 'delta', labelAs: 'relLabel', labelPrefix: 'lift +' }],
        },
      ]}
      source={{ anchorId: { prefix: 'bubble', field: 'sourceId' }, boundary: true }}
      target={{ anchorId: { prefix: 'bubble', field: 'targetId' }, boundary: true }}
      style={{
        color: { kind: 'constant', value: '#e11d48' },
        strokeWidth: { kind: 'constant', value: 1.6 },
      }}
      path={{
        label: { text: { field: 'relLabel' }, position: 0.5, sloped: true },
        options: { marks: [{ pos: 1, mark: { kind: 'arrow' } }], roundedCorners: 8 },
      }}
    />
    <Axis dimension="x" grid />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
