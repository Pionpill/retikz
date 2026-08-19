import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import {
  ContourShapeDefinition,
  CrossShapeDefinition,
  CylinderShapeDefinition,
  HexagonShapeDefinition,
  ParallelogramShapeDefinition,
  SectorShapeDefinition,
  StarShapeDefinition,
  TrapezoidShapeDefinition,
} from '@retikz/standard/shape';

/** 分两行展示 Standard 的八个可选节点形状 */
const Demo: FC = () => {
  const radius = 34;
  const style = { fill: '#ffedd5', stroke: 'darkorange', strokeWidth: 1.5 };
  const labels: Array<{ position: [number, number]; text: string }> = [
    { position: [-180, -8], text: 'cross' },
    { position: [-60, -8], text: 'sector' },
    { position: [60, -8], text: 'star' },
    { position: [180, -8], text: 'contour' },
    { position: [-180, 102], text: 'trapezoid' },
    { position: [-60, 102], text: 'parallelogram' },
    { position: [60, 102], text: 'hexagon' },
    { position: [180, 102], text: 'cylinder' },
  ];

  return (
    <Layout
      width={620}
      height={300}
      viewBox={{ x: -240, y: -105, width: 480, height: 220 }}
      shapes={[
        ContourShapeDefinition,
        CrossShapeDefinition,
        SectorShapeDefinition,
        StarShapeDefinition,
        TrapezoidShapeDefinition,
        ParallelogramShapeDefinition,
        HexagonShapeDefinition,
        CylinderShapeDefinition,
      ]}
    >
      <Node position={[-180, -55]} shape="cross" minimumSize={{ width: radius, height: radius }} {...style} />
      <Node
        position={[-60, -55]}
        shape={{
          type: 'sector',
          params: { innerRadius: radius * 0.42, outerRadius: radius, startAngle: 25, endAngle: 325 },
        }}
        {...style}
      />
      <Node
        position={[60, -55]}
        shape={{ type: 'star', params: { points: 5, innerRadius: radius * 0.46, outerRadius: radius } }}
        {...style}
      />
      <Node
        position={[180, -55]}
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
      <Node position={[-180, 55]} shape="trapezoid" minimumSize={{ width: 70, height: 48 }} {...style} />
      <Node position={[-60, 55]} shape="parallelogram" minimumSize={{ width: 64, height: 48 }} {...style} />
      <Node position={[60, 55]} shape="hexagon" minimumSize={{ width: 72, height: 48 }} {...style} />
      <Node position={[180, 55]} shape="cylinder" minimumSize={{ width: 70, height: 48 }} {...style} />
      {labels.map(label => (
        <Node key={label.text} position={label.position} fill="none" stroke="none" textColor="gray" font={{ size: 12 }}>
          {label.text}
        </Node>
      ))}
    </Layout>
  );
};

export default Demo;
