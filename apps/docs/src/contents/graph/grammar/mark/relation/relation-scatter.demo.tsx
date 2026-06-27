import type { FC } from 'react';
import { Plot, PointMark, RelationMark } from '@retikz/plot-react';

import { scatterRelations } from './relation-scatter.data';

const Demo: FC = () => (
  <Plot data={scatterRelations} width={620} height={320} style={{ maxWidth: '100%', height: 'auto' }}>
    <PointMark id="scatter-anchor-nodes" x="x" y="y" anchorId={{ prefix: 'node', field: 'id' }} opacity={0} size={8} />
    <RelationMark
      source={{ anchorId: { prefix: 'node', field: 'id' } }}
      target={{ anchorId: { prefix: 'node', field: 'target' } }}
      label={{ text: { field: 'relation' }, position: 0.45, side: 'sloped' }}
      path={{ arrow: '->', color: '#64748b', opacity: 0.55, strokeWidth: 1.1 }}
    />
    <PointMark
      x="x"
      y="y"
      color="group"
      label="label"
      labelPosition="above"
      fill="#f8fafc"
      stroke="#334155"
      strokeWidth={1}
      size={7}
    />
  </Plot>
);

export default Demo;
