import { Fragment } from 'react';
import type { FC } from 'react';
import { Coordinate, Draw, Node, Path, Step, TikZ } from '@retikz/react';

const HELP_LINE = 'var(--border)';
/** 跟随主题色——浅色 white、深色 near-black（Tailwind 4 的 --background token） */
const PAGE_BG = 'var(--background)';
const MATH_FONT = {
  family: '"Latin Modern Math", "STIX Two Math", "Cambria Math", "Times New Roman", serif',
  style: 'italic' as const,
};

const Demo: FC = () => (
  <TikZ width={600} height={360}>
    {/* 背景网格（help lines）——5 横 5 竖。
        网格沿原点对称，所以 iteration 值同时当 x（竖线）和 y（横线）的像素位置 */}
    {[-100, -50, 0, 50, 100].map(v => (
      <Fragment key={`grid-${v}`}>
        <Draw way={[[v, -140], [v, 140]]} stroke={HELP_LINE} strokeWidth={0.5} />
        <Draw way={[[-140, v], [140, v]]} stroke={HELP_LINE} strokeWidth={0.5} />
      </Fragment>
    ))}

    {/* 单位圆（半径 100px） */}
    <Path lineCap="round">
      <Step kind="move" to={[0, 0]} />
      <Step kind="circlePath" radius={100} />
    </Path>

    {/* 坐标轴 + 端点 label + 命名锚 */}
    <Draw way={[[-150, 0], [150, 0]]} arrow="->" />
    <Node position={[162, 0]} stroke="none" padding={0} font={MATH_FONT}>x</Node>
    <Coordinate id="x-axis" position={[150, 0]} />

    <Draw way={[[0, 150], [0, -150]]} arrow="->" />
    <Node position={[0, -162]} stroke="none" padding={0} font={MATH_FONT}>y</Node>
    <Coordinate id="y-axis" position={[0, -150]} />

    {/* x 轴刻度（−1, −1/2, 1）—— x 是像素位置，text 是对应数学单位标注，Node fill=PAGE_BG 把网格遮在 label 下 */}
    {[
      { x: -100, text: '−1' },
      { x: -50, text: '−1/2' },
      { x: 100, text: '1' },
    ].map(({ x, text }) => (
      <Fragment key={`tx-${x}`}>
        <Draw way={[[x, -3], [x, 3]]} />
        <Node position={[x, 14]} fill={PAGE_BG} stroke="none" padding={1}>
          {text}
        </Node>
      </Fragment>
    ))}

    {/* y 轴刻度（−1, −1/2, 1/2, 1）—— screen y-down，正像素 y 对应数学 y 负值 */}
    {[
      { y: 100, text: '−1' },
      { y: 50, text: '−1/2' },
      { y: -50, text: '1/2' },
      { y: -100, text: '1' },
    ].map(({ y, text }) => (
      <Fragment key={`ty-${y}`}>
        <Draw way={[[-3, y], [3, y]]} />
        <Node position={[-18, y]} fill={PAGE_BG} stroke="none" padding={1}>
          {text}
        </Node>
      </Fragment>
    ))}
  </TikZ>
);

export default Demo;
