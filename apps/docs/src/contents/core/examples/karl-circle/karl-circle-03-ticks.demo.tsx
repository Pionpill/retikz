import { Fragment } from 'react';
import type { FC } from 'react';
import { Circle, Coordinate, Draw, Grid, Layout, Node } from '@retikz/react';

/** 用字面色而非 `lightgray`：SVG 下载后 CSS var 不在新上下文里解析，会 fallback 成黑 */
const MATH_FONT = {
  family: '"Latin Modern Math", "STIX Two Math", "Cambria Math", "Times New Roman", serif',
  style: 'italic' as const,
};

const Demo: FC = () => (
  <Layout width={600} height={360}>
    {/* 背景网格（help lines）——直接用 Grid sugar，比手写 10 条线更短 */}
    <Grid corner1={[-100, -100]} corner2={[100, 100]} step={50} stroke="lightgray" strokeWidth={0.5} />

    {/* 单位圆（半径 100px） */}
    <Circle center={[0, 0]} radius={100} lineCap="round" />

    {/* 坐标轴 + 端点 label + 命名锚 */}
    <Draw way={[[-150, 0], [150, 0]]} arrow="->" />
    <Node position={[162, 0]} stroke="none" padding={0} font={MATH_FONT}>x</Node>
    <Coordinate id="x-axis" position={[150, 0]} />

    <Draw way={[[0, 150], [0, -150]]} arrow="->" />
    <Node position={[0, -162]} stroke="none" padding={0} font={MATH_FONT}>y</Node>
    <Coordinate id="y-axis" position={[0, -150]} />

    {/* x 轴刻度（−1, −1/2, 1）—— x 是像素位置，text 是对应数学单位标注；
        label 位置在 tick 基础上左偏 10px，避开圆周与轴线重叠 */}
    {[
      { x: -100, text: '−1' },
      { x: -50, text: '−1/2' },
      { x: 100, text: '1' },
    ].map(({ x, text }) => (
      <Fragment key={`tx-${x}`}>
        <Draw way={[[x, -3], [x, 3]]} />
        <Node position={[x - 10, 14]} stroke="none" padding={1}>
          {text}
        </Node>
      </Fragment>
    ))}

    {/* y 轴刻度（−1, −1/2, 1/2, 1）—— screen y-down，正像素 y 对应数学 y 负值；
        label 位置在 tick 基础上下偏 10px，避开圆周顶 / 底点重叠 */}
    {[
      { y: 100, text: '−1' },
      { y: 50, text: '−1/2' },
      { y: -50, text: '1/2' },
      { y: -100, text: '1' },
    ].map(({ y, text }) => (
      <Fragment key={`ty-${y}`}>
        <Draw way={[[-3, y], [3, y]]} />
        <Node position={[-18, y + 10]} stroke="none" padding={1}>
          {text}
        </Node>
      </Fragment>
    ))}
  </Layout>
);

export default Demo;
