import type { FC } from 'react';

import { DrawWay } from '@retikz/core';
import { Draw, Layout, Node } from '@retikz/react';

const POINTS: Array<[number, number]> = [
  [-145, 45],
  [-105, -55],
  [-25, -85],
  [85, -65],
  [145, 20],
  [95, 80],
  [-35, 90],
  [-95, 70],
  [-45, -15],
  [25, 35],
  [65, -5],
];

const HULL: Array<[number, number]> = [
  POINTS[0],
  POINTS[1],
  POINTS[2],
  POINTS[3],
  POINTS[4],
  POINTS[5],
  POINTS[6],
  POINTS[7],
];

/** 输入点集与凸包边界示意。 */
const Demo: FC = () => (
  <Layout
    width={520}
    height={250}
    viewBox={{ x: -180, y: -120, width: 360, height: 250 }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <Draw way={[...HULL, DrawWay.Cycle]} stroke="darkorange" strokeWidth={2} />
    {POINTS.map(([x, y], index) => (
      <Node
        key={`${x}-${y}`}
        position={[x, y]}
        shape="circle"
        minimumSize={index < HULL.length ? 8 : 6}
        padding={0}
        fill={index < HULL.length ? 'currentColor' : 'gray'}
        stroke="none"
      />
    ))}
    <Node position={[0, 112]} stroke="none" textColor="gray" font={{ size: 12 }}>
      convexHull(points) · CCW
    </Node>
  </Layout>
);

export default Demo;
