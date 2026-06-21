import type { FC } from 'react';
import { Circle, Coordinate, Draw, Layout, Node } from '@retikz/react';
import { useLowerTex } from '@retikz/tex/react';

const Demo: FC = () => {
  const lowerTex = useLowerTex();
  return (
    <Layout width={600} height={360} lowerTex={lowerTex}>
      {/* 单位圆（半径 100px） */}
      <Circle center={[0, 0]} radius={100} lineCap="round" />

      {/* x 轴：箭头 path + 端点 label（`$x$` 行内公式 → 数学斜体）+ 命名锚 */}
      <Draw way={[[-150, 0], [150, 0]]} arrow="->" />
      <Node position={[162, 0]} stroke="none" padding={0}>
        {'$x$'}
      </Node>
      <Coordinate id="x-axis" position={[150, 0]} />

      {/* y 轴：SVG y-down，向上是负 screen y；箭头从下端指向上端 */}
      <Draw way={[[0, 150], [0, -150]]} arrow="->" />
      <Node position={[0, -162]} stroke="none" padding={0}>
        {'$y$'}
      </Node>
      <Coordinate id="y-axis" position={[0, -150]} />
    </Layout>
  );
};

export default Demo;
