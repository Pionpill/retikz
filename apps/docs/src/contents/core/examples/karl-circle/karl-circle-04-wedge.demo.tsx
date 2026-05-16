import { Fragment } from 'react';
import type { FC } from 'react';
import { Coordinate, Draw, Node, Path, Step, TikZ } from '@retikz/react';

const UNIT = 100;
const cm = (x: number, y: number): [number, number] => [x * UNIT, -y * UNIT];
/** 数学极坐标 → retikz PolarPosition：retikz angle 是 screen-down 正向，传 -degMath */
const polar = (degMath: number, r = 1) => ({ angle: -degMath, radius: r * UNIT });

const HELP_LINE = 'oklch(0.85 0.04 250)';
const TICK_TEXT_BG = 'white';
const ANGLE_STROKE = 'oklch(0.55 0.16 145)';
const ANGLE_FILL = 'oklch(0.92 0.10 145)';

const Demo: FC = () => (
  <TikZ width={600} height={360}>
    {/* 背景网格 */}
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

    {/* 坐标轴 */}
    <Draw way={[cm(-1.5, 0), cm(1.5, 0)]} arrow="->" />
    <Node position={cm(1.62, 0)} stroke="none" padding={0}>x</Node>
    <Coordinate id="x-axis" position={cm(1.5, 0)} />
    <Draw way={[cm(0, -1.5), cm(0, 1.5)]} arrow="->" />
    <Node position={cm(0, 1.62)} stroke="none" padding={0}>y</Node>
    <Coordinate id="y-axis" position={cm(0, 1.5)} />

    {/* 刻度 */}
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

    {/* 30° 扇形（filldraw + arc）—— ArcStep 把 prev anchor 当圆心：
        move (0,0) → arc 以 (0,0) 为圆心、自动从 (radius, 0) 起笔 → line 回 (0,0) 让 fill 闭合 */}
    <Path fill={ANGLE_FILL} stroke={ANGLE_STROKE}>
      <Step kind="move" to={cm(0, 0)} />
      <Step kind="arc" startAngle={0} endAngle={-30} radius={30} />
      <Step kind="line" to={cm(0, 0)} />
    </Path>

    {/* α 文字标签（极坐标 15°、距原点 0.22cm） */}
    <Node position={polar(15, 0.22)} stroke="none" textColor={ANGLE_STROKE} padding={1}>
      α
    </Node>
  </TikZ>
);

export default Demo;
