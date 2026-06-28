import type { FC } from 'react';
import { Plot, PointMark, RelationMark } from '@retikz/plot-react';

import { sankeyNodeColors, sankeyRelations } from './relation-sankey.data';

const Demo: FC = () => (
  <Plot
    data={sankeyRelations}
    colors={sankeyNodeColors}
    width={620}
    height={320}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <RelationMark
      kind="ribbon"
      source={{ project: { x: 'sourceX', y: 'sourceY' } }}
      target={{ project: { x: 'targetX', y: 'targetY' } }}
      style={{
        fill: { kind: 'field', value: 'flowFill' },
        fillOpacity: { kind: 'constant', value: 0.5 },
        stroke: { kind: 'constant', value: 'none' },
      }}
      ribbon={{
        width: { kind: 'field', value: 'width' },
        options: { samples: 48, align: 'center' },
      }}
    />
    <PointMark
      x="nodeX"
      y="nodeY"
      shape="rectangle"
      fill="nodeFill"
      stroke="#ffffff"
      strokeWidth={0.9}
      minimumWidth={8}
      minimumHeight={{ kind: 'field', value: 'nodeHeight' }}
      label="nodeLabel"
      labelPosition="left"
      labelDistance={10}
      labelTextColor="#0f172a"
      labelFont={{ size: 11, weight: 'bold' }}
    />
  </Plot>
);

export default Demo;
