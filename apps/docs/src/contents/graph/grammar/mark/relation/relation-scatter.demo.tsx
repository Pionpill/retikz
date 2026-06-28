import type { FC } from 'react';
import { Plot, PointMark, RelationMark } from '@retikz/plot-react';

import { scatterRelations } from './relation-scatter.data';

const Demo: FC = () => (
  <Plot data={scatterRelations} width={620} height={320} style={{ maxWidth: '100%', height: 'auto' }}>
    <PointMark
      id="scatter-nodes"
      x="x"
      y="y"
      anchorId={{ prefix: 'node', field: 'id' }}
      color="group"
      label="label"
      labelPosition="above"
      fill="#f8fafc"
      stroke="#334155"
      strokeWidth={1}
      size={7}
      zIndex={2}
    />
    <RelationMark
      source={{ anchorId: { prefix: 'node', field: 'id' } }}
      target={{ anchorId: { prefix: 'node', field: 'target' } }}
      style={{
        color: { kind: 'constant', value: '#64748b' },
        opacity: { kind: 'constant', value: 0.55 },
        strokeWidth: { kind: 'constant', value: 1.1 },
        zIndex: { kind: 'constant', value: 1 },
      }}
      path={{
        label: { text: { field: 'relation' }, position: 0.45, side: 'sloped' },
        options: { arrow: '->' },
      }}
    />
  </Plot>
);

export default Demo;
