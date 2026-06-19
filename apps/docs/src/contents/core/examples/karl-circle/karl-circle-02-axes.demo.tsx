import type { FC } from 'react';
import { Circle, Coordinate, Draw, Layout } from '@retikz/react';
import { TexNode, useLowerTex } from '@retikz/tex/react';

const Demo: FC = () => {
  const lowerTex = useLowerTex();
  return (
    <Layout width={600} height={360} lowerTex={lowerTex}>
      {/* 单位圆（半径 100px） */}
      <Circle center={[0, 0]} radius={100} lineCap="round" />

      {/* x 轴：箭头 path + 端点 label（TexNode 渲染数学斜体 x）+ 命名锚 */}
      <Draw way={[[-150, 0], [150, 0]]} arrow="->" />
      <TexNode position={[162, 0]} stroke="none" padding={0}>
        {'x'}
      </TexNode>
      <Coordinate id="x-axis" position={[150, 0]} />

      {/* y 轴：SVG y-down，向上是负 screen y；箭头从下端指向上端 */}
      <Draw way={[[0, 150], [0, -150]]} arrow="->" />
      <TexNode position={[0, -162]} stroke="none" padding={0}>
        {'y'}
      </TexNode>
      <Coordinate id="y-axis" position={[0, -150]} />
    </Layout>
  );
};

export default Demo;
