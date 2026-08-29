import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import {
  ContourShapeDefinition,
  CrossShapeDefinition,
  CylinderShapeDefinition,
  EllipticCapsuleShapeDefinition,
  HexagonShapeDefinition,
  ParallelogramShapeDefinition,
  SectorShapeDefinition,
  StarShapeDefinition,
  TrapezoidShapeDefinition,
} from '@retikz/standard/shape';

/** 分三行展示 Standard 的九个可选节点形状 */
const Demo: FC = () => {
  const radius = 34;
  const style = { fill: '#ffedd5', stroke: 'darkorange', strokeWidth: 1.5 };
  const labels: Array<{ position: [number, number]; text: string }> = [
    { position: [-150, -42], text: 'cross' },
    { position: [0, -42], text: 'sector' },
    { position: [150, -42], text: 'star' },
    { position: [-150, 68], text: 'contour' },
    { position: [0, 68], text: 'trapezoid' },
    { position: [150, 68], text: 'parallelogram' },
    { position: [-150, 178], text: 'hexagon' },
    { position: [0, 178], text: 'cylinder' },
    { position: [150, 178], text: 'ellipticCapsule' },
  ];

  return (
    <Layout
      width={620}
      height={410}
      viewBox={{ x: -240, y: -145, width: 480, height: 330 }}
      shapes={[
        ContourShapeDefinition,
        CrossShapeDefinition,
        SectorShapeDefinition,
        StarShapeDefinition,
        TrapezoidShapeDefinition,
        ParallelogramShapeDefinition,
        HexagonShapeDefinition,
        CylinderShapeDefinition,
        EllipticCapsuleShapeDefinition,
      ]}
    >
      <Node position={[-150, -90]} shape="cross" minimumSize={{ width: radius, height: radius }} {...style} />
      <Node
        position={[0, -90]}
        shape={{
          type: 'sector',
          params: { innerRadius: radius * 0.42, outerRadius: radius, startAngle: 25, endAngle: 325 },
        }}
        {...style}
      />
      <Node
        position={[150, -90]}
        shape={{ type: 'star', params: { points: 5, innerRadius: radius * 0.46, outerRadius: radius } }}
        {...style}
      />
      <Node
        position={[-150, 20]}
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
      <Node position={[0, 20]} shape="trapezoid" minimumSize={{ width: 70, height: 48 }} {...style} />
      <Node position={[150, 20]} shape="parallelogram" minimumSize={{ width: 64, height: 48 }} {...style} />
      <Node position={[-150, 130]} shape="hexagon" minimumSize={{ width: 72, height: 48 }} {...style} />
      <Node position={[0, 130]} shape="cylinder" minimumSize={{ width: 70, height: 48 }} {...style} />
      <Node position={[150, 130]} shape="ellipticCapsule" minimumSize={{ width: 70, height: 48 }} {...style} />
      {labels.map(label => (
        <Node key={label.text} position={label.position} fill="none" stroke="none" textColor="gray" font={{ size: 12 }}>
          {label.text}
        </Node>
      ))}
    </Layout>
  );
};

export default Demo;
