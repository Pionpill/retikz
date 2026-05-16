import { Fragment } from 'react';
import type { FC } from 'react';
import { Coordinate, Draw, Node, Path, Step, TikZ } from '@retikz/react';

const UNIT = 100;
const cm = (x: number, y: number): [number, number] => [x * UNIT, -y * UNIT];
const polar = (degMath: number, r = 1) => ({ angle: -degMath, radius: r * UNIT });

const HELP_LINE = '#d4d4d4';
const PAGE_BG = 'white';
const ANGLE_STROKE = 'oklch(0.55 0.16 145)';
const ANGLE_FILL = 'oklch(0.92 0.10 145)';
const SIN_COLOR = '#ef4444';
const COS_COLOR = '#2563eb';
const TAN_COLOR = 'oklch(0.72 0.16 60)';
const INFO_BG = 'oklch(0.96 0.04 25)';
const MATH_FONT = {
  family: '"Latin Modern Math", "STIX Two Math", "Cambria Math", "Times New Roman", serif',
  style: 'italic' as const,
};

const COS30 = Math.cos((30 * Math.PI) / 180);
const SIN30 = Math.sin((30 * Math.PI) / 180);
const TAN30 = SIN30 / COS30;

const Demo: FC = () => (
  <TikZ width={720} height={360}>
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
    <Node position={cm(1.62, 0)} stroke="none" padding={0} font={MATH_FONT}>x</Node>
    <Coordinate id="x-axis" position={cm(1.5, 0)} />
    <Draw way={[cm(0, -1.5), cm(0, 1.5)]} arrow="->" />
    <Node position={cm(0, 1.62)} stroke="none" padding={0} font={MATH_FONT}>y</Node>
    <Coordinate id="y-axis" position={cm(0, 1.5)} />

    {/* 刻度 */}
    {[
      { x: -1, text: '−1' },
      { x: -0.5, text: '−1/2' },
      { x: 1, text: '1' },
    ].map(({ x, text }) => (
      <Fragment key={`tx-${x}`}>
        <Draw way={[[x * UNIT, -3], [x * UNIT, 3]]} />
        <Node position={[x * UNIT, 14]} fill={PAGE_BG} stroke="none" padding={1}>
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
        <Node position={[-18, -y * UNIT]} fill={PAGE_BG} stroke="none" padding={1}>
          {text}
        </Node>
      </Fragment>
    ))}

    {/* 30° 扇形 + α */}
    <Path fill={ANGLE_FILL} stroke={ANGLE_STROKE}>
      <Step kind="move" to={cm(0, 0)} />
      <Step kind="arc" startAngle={0} endAngle={-30} radius={30} />
      <Step kind="line" to={cm(0, 0)} />
    </Path>
    <Node position={polar(15, 0.22)} stroke="none" textColor={ANGLE_STROKE} padding={1} font={MATH_FONT}>
      α
    </Node>

    {/* sin α / cos α / tan α */}
    <Draw
      way={[polar(30, 1), { label: { text: 'sin α', side: 'left' } }, cm(COS30, 0)]}
      stroke={SIN_COLOR}
      thickness="veryThick"
    />
    <Draw
      way={[cm(COS30, 0), { label: { text: 'cos α', side: 'below' } }, cm(0, 0)]}
      stroke={COS_COLOR}
      thickness="veryThick"
    />
    <Draw
      way={[cm(1, 0), { label: { text: 'tan α = sin α / cos α', side: 'right' } }, cm(1, TAN30)]}
      stroke={TAN_COLOR}
      thickness="veryThick"
    />
    <Coordinate id="t" position={cm(1, TAN30)} />
    <Draw way={[cm(0, 0), 't']} />

    {/* 右侧信息说明框 —— LineSpec.fill 行级换色（行内片段着色暂不支持） */}
    <Node
      position={cm(2.6, -0.1)}
      shape="rectangle"
      fill={INFO_BG}
      stroke="none"
      roundedCorners={6}
      padding={10}
      align="left"
      text={[
        { text: '角 α = 30°', fill: ANGLE_STROKE },
        '即 π/6 弧度',
        '',
        { text: 'sin α = 1/2', fill: SIN_COLOR },
        '（红线长度）',
        '',
        { text: 'cos α = √3/2', fill: COS_COLOR },
        '（蓝线长度）',
        '',
        { text: 'tan α = 1/√3', fill: TAN_COLOR },
        '（橙线长度）',
      ]}
    />
  </TikZ>
);

export default Demo;
