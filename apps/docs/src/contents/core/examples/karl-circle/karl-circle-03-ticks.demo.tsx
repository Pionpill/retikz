import { Fragment } from 'react';
import type { FC } from 'react';
import { Coordinate, Draw, Node, Path, Step, TikZ } from '@retikz/react';

const UNIT = 100;
const cm = (x: number, y: number): [number, number] => [x * UNIT, -y * UNIT];

const HELP_LINE = 'oklch(0.85 0.04 250)';
const TICK_TEXT_BG = 'white';

const Demo: FC = () => (
  <TikZ width={600} height={360}>
    {/* 背景网格（help lines）—— .map() 替代 TikZ \foreach，IR 暂无 grid step */}
    {[-1, -0.5, 0, 0.5, 1].map(v => (
      <Fragment key={`grid-${v}`}>
        <Draw way={[cm(v, -1.4), cm(v, 1.4)]} stroke={HELP_LINE} strokeWidth={0.5} />
        <Draw way={[cm(-1.4, v), cm(1.4, v)]} stroke={HELP_LINE} strokeWidth={0.5} />
      </Fragment>
    ))}

    {/* 单位圆 */}
    <Path lineCap="round">
      <Step kind="move" to={cm(0, 0)} />
      <Step kind="circlePath" radius={UNIT} />
    </Path>

    {/* 坐标轴 + 端点 label + 命名锚 */}
    <Draw way={[cm(-1.5, 0), cm(1.5, 0)]} arrow="->" />
    <Node position={cm(1.62, 0)} stroke="none" padding={0}>x</Node>
    <Coordinate id="x-axis" position={cm(1.5, 0)} />

    <Draw way={[cm(0, -1.5), cm(0, 1.5)]} arrow="->" />
    <Node position={cm(0, 1.62)} stroke="none" padding={0}>y</Node>
    <Coordinate id="y-axis" position={cm(0, 1.5)} />

    {/* x 轴刻度（-1, -1/2, 1）—— Node fill=white 把网格遮在 label 下 */}
    {[
      { x: -1, text: '−1' },
      { x: -0.5, text: '−1/2' },
      { x: 1, text: '1' },
    ].map(({ x, text }) => (
      <Fragment key={`tx-${x}`}>
        <Draw way={[[x * UNIT, -3], [x * UNIT, 3]]} />
        <Node position={[x * UNIT, 14]} fill={TICK_TEXT_BG} stroke="none" padding={1}>
          {text}
        </Node>
      </Fragment>
    ))}

    {/* y 轴刻度（-1, -1/2, 1/2, 1） */}
    {[
      { y: -1, text: '−1' },
      { y: -0.5, text: '−1/2' },
      { y: 0.5, text: '1/2' },
      { y: 1, text: '1' },
    ].map(({ y, text }) => (
      <Fragment key={`ty-${y}`}>
        <Draw way={[[-3, -y * UNIT], [3, -y * UNIT]]} />
        <Node position={[-18, -y * UNIT]} fill={TICK_TEXT_BG} stroke="none" padding={1}>
          {text}
        </Node>
      </Fragment>
    ))}
  </TikZ>
);

export default Demo;
