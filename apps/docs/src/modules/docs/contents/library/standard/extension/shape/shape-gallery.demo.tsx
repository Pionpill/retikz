import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import {
  ContourShapeDefinition,
  CrossShapeDefinition,
  SectorShapeDefinition,
  StarShapeDefinition,
} from '@retikz/standard/shape';

/** 横向展示 Standard 的四个可选节点形状与 Sector 的两种状态 */
const Demo: FC = () => {
  const radius = 42;
  const style = { fill: '#ffedd5', stroke: 'darkorange', strokeWidth: 1.5 };
  const labels: Array<{ position: [number, number]; text: string }> = [
    { position: [-240, 72], text: 'cross' },
    { position: [-120, 72], text: 'sector (arc)' },
    { position: [0, 72], text: 'sector' },
    { position: [120, 72], text: 'star' },
    { position: [240, 72], text: 'contour' },
  ];

  return (
    <Layout
      width={620}
      height={210}
      viewBox={{ x: -300, y: -105, width: 600, height: 210 }}
      shapes={[ContourShapeDefinition, CrossShapeDefinition, SectorShapeDefinition, StarShapeDefinition]}
    >
      <Node position={[-240, 0]} shape="cross" minimumSize={{ width: radius, height: radius }} {...style} />
      <Node
        position={[-120, 0]}
        shape={{ type: 'sector', params: { innerRadius: radius, outerRadius: radius, startAngle: 35, endAngle: 310 } }}
        fill="none"
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
      />
      <Node
        position={[0, 0]}
        shape={{
          type: 'sector',
          params: { innerRadius: radius * 0.42, outerRadius: radius, startAngle: 25, endAngle: 325 },
        }}
        {...style}
      />
      <Node
        position={[120, 0]}
        shape={{ type: 'star', params: { points: 5, innerRadius: radius * 0.46, outerRadius: radius } }}
        {...style}
      />
      <Node
        position={[240, 0]}
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
