import type { FC } from 'react';
import { Axis, PathMark, Plot, PointMark, RelationMark } from '@retikz/plot-react';

import { pathExtremeRelations } from './relation-path-extremes.data';

const Demo: FC = () => (
  <Plot data={pathExtremeRelations} width={620} height={320} style={{ maxWidth: '100%', height: 'auto' }}>
    <PathMark x="x" y="y" order="order" stroke="#0f766e" strokeWidth={2.2} />
    <RelationMark
      source={{ project: { x: 'lowX', y: 'lowY' } }}
      target={{ project: { x: 'highX', y: 'highY' } }}
      route={[{ kind: 'bend', bendDirection: 'left', bendAngle: 32, label: { text: { field: 'deltaLabel' }, position: 0.48, side: 'sloped' } }]}
      path={{ arrow: '->', color: '#f97316', strokeWidth: 1.6 }}
    />
    <PointMark x="lowX" y="lowY" label="lowLabel" labelPosition="below" fill="#fff7ed" stroke="#f97316" strokeWidth={1.3} size={7} />
    <PointMark x="highX" y="highY" label="highLabel" labelPosition="above" fill="#ecfdf5" stroke="#0f766e" strokeWidth={1.3} size={7} />
    <Axis dimension="x" grid />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
