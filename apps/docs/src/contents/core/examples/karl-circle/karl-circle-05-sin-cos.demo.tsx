import { Fragment } from 'react';
import type { FC } from 'react';
import { Coordinate, Draw, Node, Path, Step, TikZ } from '@retikz/react';

const HELP_LINE = 'var(--border)';
const PAGE_BG = 'var(--background)';
const ANGLE_STROKE = 'oklch(0.55 0.16 145)';
const ANGLE_FILL = 'oklch(0.92 0.10 145)';
const SIN_COLOR = '#ef4444';
const COS_COLOR = '#2563eb';
const MATH_FONT = {
  family: '"Latin Modern Math", "STIX Two Math", "Cambria Math", "Times New Roman", serif',
  style: 'italic' as const,
};

const COS30 = Math.cos((30 * Math.PI) / 180);

const Demo: FC = () => (
  <TikZ width={600} height={360}>
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
        <Node position={[x, 14]} fill={PAGE_BG} stroke="none" padding={1}>
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
        <Node position={[-18, y]} fill={PAGE_BG} stroke="none" padding={1}>
          {text}
        </Node>
      </Fragment>
    ))}

    {/* 30° 扇形 + α 标签 */}
    <Path fill={ANGLE_FILL} stroke={ANGLE_STROKE}>
      <Step kind="move" to={[0, 0]} />
      <Step kind="arc" startAngle={0} endAngle={-30} radius={30} />
      <Step kind="line" to={[0, 0]} />
    </Path>
    <Node position={{ angle: -15, radius: 22 }} stroke="none" textColor={ANGLE_STROKE} padding={1} font={MATH_FONT}>
      α
    </Node>

    {/* sin α 红色竖线：从圆周 (30°, 100px) 垂直落到 x 轴投影点 (cos30·100, 0)
        IR 还没投影 target，手算投影坐标兜底；label 用 Draw way 内的 { label } 算子 */}
    <Draw
      way={[{ angle: -30, radius: 100 }, { label: { text: 'sin α', side: 'left' } }, [COS30 * 100, 0]]}
      stroke={SIN_COLOR}
      thickness="thick"
    />

    {/* cos α 蓝色横线：投影点 → 原点 */}
    <Draw
      way={[[COS30 * 100, 0], { label: { text: 'cos α', side: 'below' } }, [0, 0]]}
      stroke={COS_COLOR}
      thickness="thick"
    />
  </TikZ>
);

export default Demo;
