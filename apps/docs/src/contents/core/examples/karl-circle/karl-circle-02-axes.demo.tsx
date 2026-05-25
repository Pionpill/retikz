import type { FC } from 'react';
import { Circle, Coordinate, Draw, Layout, Node } from '@retikz/react';

/** 数学变量字体——LaTeX 习惯：变量用衬线斜体（Computer Modern italic 风格）；Latin Modern Math 缺失时回退到系统 STIX / Cambria / Times */
const MATH_FONT = {
  family: '"Latin Modern Math", "STIX Two Math", "Cambria Math", "Times New Roman", serif',
  style: 'italic' as const,
};

const Demo: FC = () => (
  <Layout width={600} height={360}>
    {/* 单位圆（半径 100px） */}
    <Circle center={[0, 0]} radius={100} lineCap="round" />

    {/* x 轴：箭头 path + 端点 label + 命名锚 */}
    <Draw way={[[-150, 0], [150, 0]]} arrow="->" />
    <Node position={[162, 0]} stroke="none" padding={0} font={MATH_FONT}>x</Node>
    <Coordinate id="x-axis" position={[150, 0]} />

    {/* y 轴：SVG y-down，向上是负 screen y；箭头从下端指向上端 */}
    <Draw way={[[0, 150], [0, -150]]} arrow="->" />
    <Node position={[0, -162]} stroke="none" padding={0} font={MATH_FONT}>y</Node>
    <Coordinate id="y-axis" position={[0, -150]} />
  </Layout>
);

export default Demo;
