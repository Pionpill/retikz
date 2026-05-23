import { Fragment } from 'react';
import type { FC } from 'react';
import { Coordinate, Draw, Layout, Node, Path, Step } from '@retikz/react';

// 字面色而非 CSS var：SVG 下载后 CSS var 不在新上下文里解析，会 fallback 成黑
const HELP_LINE = '#e5e7eb';
const ANGLE_STROKE = 'oklch(0.55 0.16 145)';
const ANGLE_FILL = 'oklch(0.92 0.10 145)';
const MATH_FONT = {
  family: '"Latin Modern Math", "STIX Two Math", "Cambria Math", "Times New Roman", serif',
  style: 'italic' as const,
};

const Demo: FC = () => (
  <Layout width={600} height={360}>
    {/* 背景网格 */}
    {[-100, -50, 0, 50, 100].map(v => (
      <Fragment key={`grid-${v}`}>
        <Draw way={[[v, -140], [v, 140]]} stroke={HELP_LINE} strokeWidth={0.5} />
        <Draw way={[[-140, v], [140, v]]} stroke={HELP_LINE} strokeWidth={0.5} />
      </Fragment>
    ))}

    {/* 单位圆 */}
    <Path lineCap="round">
      <Step kind="move" to={[0, 0]} />
      <Step kind="circlePath" radius={100} />
    </Path>

    {/* 坐标轴 */}
    <Draw way={[[-150, 0], [150, 0]]} arrow="->" />
    <Node position={[162, 0]} stroke="none" padding={0} font={MATH_FONT}>x</Node>
    <Coordinate id="x-axis" position={[150, 0]} />
    <Draw way={[[0, 150], [0, -150]]} arrow="->" />
    <Node position={[0, -162]} stroke="none" padding={0} font={MATH_FONT}>y</Node>
    <Coordinate id="y-axis" position={[0, -150]} />

    {/* 刻度 */}
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

    {/* 30° 扇形（filldraw + arc）—— ArcStep 把 prev anchor 当圆心：
        move (0,0) → arc 以 (0,0) 为圆心、自动从 (radius, 0) 起笔 → line 回 (0,0) 让 fill 闭合。
        endAngle=-30 用 screen-down 角度系（负角对应数学正向，即向上扫） */}
    <Path fill={ANGLE_FILL} stroke={ANGLE_STROKE}>
      <Step kind="move" to={[0, 0]} />
      <Step kind="arc" startAngle={0} endAngle={-30} radius={30} />
      <Step kind="line" to={[0, 0]} />
    </Path>

    {/* α 文字标签（极坐标 screen 角 -15°、距原点 22px）——math 斜体衬线 */}
    <Node position={{ angle: -15, radius: 22 }} stroke="none" textColor={ANGLE_STROKE} padding={1} font={MATH_FONT}>
      α
    </Node>
  </Layout>
);

export default Demo;
