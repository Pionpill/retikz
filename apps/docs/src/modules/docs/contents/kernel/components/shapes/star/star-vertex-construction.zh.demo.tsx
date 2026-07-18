import type { FC } from 'react';

import { Circle, Draw, Layout, Node, Star } from '@retikz/react';

const CENTER: [number, number] = [-75, 0];
const OUTER_RADIUS = 75;
const INNER_RADIUS = 35;
const POINTS = 5;

/** 按屏幕坐标系角度计算圆周点 */
const pointAt = (radius: number, angle: number): [number, number] => {
  const radians = (angle * Math.PI) / 180;
  return [CENTER[0] + radius * Math.cos(radians), CENTER[1] + radius * Math.sin(radians)];
};

/** 星形顶点交替构造示意 */
const Demo: FC = () => {
  const vertices = Array.from({ length: POINTS * 2 }, (_, index) =>
    pointAt(index % 2 === 0 ? OUTER_RADIUS : INNER_RADIUS, -90 + (index * 180) / POINTS),
  );

  return (
    <Layout width={400} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
      <Circle center={CENTER} radius={OUTER_RADIUS} stroke="lightgray" fill="none" dashPattern={[4, 4]} />
      <Circle center={CENTER} radius={INNER_RADIUS} stroke="lightgray" fill="none" dashPattern={[4, 4]} />
      <Star
        center={CENTER}
        outerRadius={OUTER_RADIUS}
        innerRadius={INNER_RADIUS}
        points={POINTS}
        stroke="currentColor"
        strokeWidth={1.5}
        fill="lightgray"
        fillOpacity={0.14}
      />

      <Draw
        way={[
          CENTER,
          {
            label: { text: 'R', side: 'top', sloped: true, textColor: 'darkorange', font: { size: 12 } },
          },
          vertices[0],
        ]}
        stroke="darkorange"
      />
      <Draw
        way={[
          CENTER,
          {
            label: { text: 'r', side: 'top', sloped: true, textColor: 'dodgerblue', font: { size: 12 } },
          },
          vertices[1],
        ]}
        stroke="dodgerblue"
      />

      {vertices.map((vertex, index) => (
        <Circle
          key={index}
          center={vertex}
          radius={4}
          stroke="none"
          fill={index % 2 === 0 ? 'darkorange' : 'dodgerblue'}
        />
      ))}
      <Circle center={CENTER} radius={3} stroke="none" fill="dimgray" />

      <Circle center={[25, -58]} radius={4} stroke="none" fill="darkorange" />
      <Node position={[105, -58]} stroke="none" font={{ size: 14 }}>
        尖角 tip / R
      </Node>
      <Circle center={[25, -18]} radius={4} stroke="none" fill="dodgerblue" />
      <Node position={[105, -18]} stroke="none" font={{ size: 14 }}>
        凹角 notch / r
      </Node>
      <Node position={[105, 28]} stroke="none" font={{ size: 14 }}>
        顶点：2p
      </Node>
      <Node position={[105, 68]} stroke="none" font={{ size: 14 }}>
        Δθ = 180° / p
      </Node>
    </Layout>
  );
};

export default Demo;
