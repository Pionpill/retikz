import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import {
  ContourShapeDefinition,
  CrossShapeDefinition,
  SectorShapeDefinition,
  StarShapeDefinition,
} from '@retikz/standard/shape';

/** 横向展示 Standard 的四个可选节点形状 */
const Demo: FC = () => {
  const radius = 42;
  const style = { fill: '#ffedd5', stroke: 'darkorange', strokeWidth: 1.5 };
  const labels: Array<{ position: [number, number]; text: string }> = [
    { position: [-180, 72], text: 'cross' },
    { position: [-60, 72], text: 'sector' },
    { position: [60, 72], text: 'star' },
    { position: [180, 72], text: 'contour' },
  ];

  return (
    <Layout
      width={620}
      height={210}
      viewBox={{ x: -240, y: -105, width: 480, height: 210 }}
      shapes={[ContourShapeDefinition, CrossShapeDefinition, SectorShapeDefinition, StarShapeDefinition]}
    >
      <Node position={[-180, 0]} shape="cross" minimumSize={{ width: radius, height: radius }} {...style} />
      <Node
        position={[-60, 0]}
        shape={{
          type: 'sector',
          params: { innerRadius: radius * 0.42, outerRadius: radius, startAngle: 25, endAngle: 325 },
        }}
        {...style}
      />
      <Node
        position={[60, 0]}
        shape={{ type: 'star', params: { points: 5, innerRadius: radius * 0.46, outerRadius: radius } }}
        {...style}
      />
      <Node
        position={[180, 0]}
        shape={{
          type: 'contour',
          params: {
            points: [
              [-radius, -radius * 0.35],
              [0, -radius],
              [radius, -radius * 0.35],
              [radius * 0.7, radius],
              [-radius * 0.7, radius],
            ],
          },
        }}
        {...style}
      />
      {labels.map(label => (
        <Node key={label.text} position={label.position} fill="none" stroke="none" textColor="gray" font={{ size: 12 }}>
          {label.text}
        </Node>
      ))}
    </Layout>
  );
};

export default Demo;
