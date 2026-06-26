import type { FC } from 'react';
import { Axis, PathMark, Plot, PointMark, RelationMark } from '@retikz/plot-react';

import { pathExtremeRelations } from './relation-path-extremes.data';

const Demo: FC = () => (
  <Plot data={pathExtremeRelations} width={620} height={320} style={{ maxWidth: '100%', height: 'auto' }}>
    <PathMark x="x" y="y" order="order" stroke="#0f766e" strokeWidth={2.2} anchorId={{ prefix: 'trend', field: 'id' }} />
    <PointMark x="x" y="y" fill="#ffffff" stroke="#0f766e" strokeWidth={1} size={4.5} />
    <RelationMark
      transform={[
        {
          kind: 'derive-relation',
          source: { select: 'min', by: 'y', fields: { id: 'id' } },
          target: { select: 'max', by: 'y', fields: { id: 'id' } },
          measure: { kind: 'difference', field: 'y', labelAs: 'deltaLabel', labelPrefix: '+' },
        },
      ]}
      source={{ anchorId: { prefix: 'trend', field: 'sourceId' } }}
      target={{ anchorId: { prefix: 'trend', field: 'targetId' } }}
      routing={{ kind: 'bend', bendDirection: 'left', bendAngle: 32 }}
      label={{ text: { field: 'deltaLabel' }, position: 0.5, side: 'sloped', textColor: '#ea580c', font: { size: 11, weight: 'bold' } }}
      path={{ arrow: '->', color: '#f97316', strokeWidth: 1.6 }}
    />
    <Axis dimension="x" grid />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
