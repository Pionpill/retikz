import { Fragment } from 'react';
import type { FC } from 'react';
import { Coordinate, Draw, Node, Path, Step, TikZ } from '@retikz/react';

const HELP_LINE = 'var(--border)';
const PAGE_BG = 'var(--background)';
const ANGLE_STROKE = 'oklch(0.55 0.16 145)';
const ANGLE_FILL = 'oklch(0.92 0.10 145)';
const SIN_COLOR = '#ef4444';
const COS_COLOR = '#2563eb';
const TAN_COLOR = 'oklch(0.72 0.16 60)';
const INFO_BG = 'var(--muted)';
const MATH_FONT = {
  family: '"Latin Modern Math", "STIX Two Math", "Cambria Math", "Times New Roman", serif',
  style: 'italic' as const,
};

const COS30 = Math.cos((30 * Math.PI) / 180);
const SIN30 = Math.sin((30 * Math.PI) / 180);
const TAN30 = SIN30 / COS30;

const Demo: FC = () => (
  <TikZ width={720} height={360}>
    {/* Background grid */}
    {[-100, -50, 0, 50, 100].map(v => (
      <Fragment key={`grid-${v}`}>
        <Draw way={[[v, -140], [v, 140]]} stroke={HELP_LINE} strokeWidth={0.5} />
        <Draw way={[[-140, v], [140, v]]} stroke={HELP_LINE} strokeWidth={0.5} />
      </Fragment>
    ))}

    {/* Unit circle */}
    <Path lineCap="round">
      <Step kind="move" to={[0, 0]} />
      <Step kind="circlePath" radius={100} />
    </Path>

    {/* Axes */}
    <Draw way={[[-150, 0], [150, 0]]} arrow="->" />
    <Node position={[162, 0]} stroke="none" padding={0} font={MATH_FONT}>x</Node>
    <Coordinate id="x-axis" position={[150, 0]} />
    <Draw way={[[0, 150], [0, -150]]} arrow="->" />
    <Node position={[0, -162]} stroke="none" padding={0} font={MATH_FONT}>y</Node>
    <Coordinate id="y-axis" position={[0, -150]} />

    {/* Ticks */}
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

    {/* 30° wedge + α */}
    <Path fill={ANGLE_FILL} stroke={ANGLE_STROKE}>
      <Step kind="move" to={[0, 0]} />
      <Step kind="arc" startAngle={0} endAngle={-30} radius={30} />
      <Step kind="line" to={[0, 0]} />
    </Path>
    <Node position={{ angle: -15, radius: 22 }} stroke="none" textColor={ANGLE_STROKE} padding={1} font={MATH_FONT}>
      α
    </Node>

    {/* sin α / cos α / tan α */}
    <Draw
      way={[{ angle: -30, radius: 100 }, { label: { text: 'sin α', side: 'left' } }, [COS30 * 100, 0]]}
      stroke={SIN_COLOR}
      thickness="thick"
    />
    <Draw
      way={[[COS30 * 100, 0], { label: { text: 'cos α', side: 'below' } }, [0, 0]]}
      stroke={COS_COLOR}
      thickness="thick"
    />
    <Draw
      way={[[100, 0], { label: { text: 'tan α = sin α / cos α', side: 'right' } }, [100, -TAN30 * 100]]}
      stroke={TAN_COLOR}
      thickness="thick"
    />
    <Coordinate id="t" position={[100, -TAN30 * 100]} />
    <Draw way={[[0, 0], 't']} />

    {/* Right-hand info box — LineSpec.fill switches color per line (inline-span coloring not yet supported) */}
    <Node
      position={[320, 10]}
      shape="rectangle"
      fill={INFO_BG}
      stroke="none"
      roundedCorners={6}
      innerXSep={10}
      innerYSep={4}
      align="left"
      text={[
        { text: 'angle α = 30°', fill: ANGLE_STROKE },
        '(π/6 in radians)',
        '',
        { text: 'sin α = 1/2', fill: SIN_COLOR },
        '(length of red line)',
        '',
        { text: 'cos α = √3/2', fill: COS_COLOR },
        '(length of blue line)',
        '',
        { text: 'tan α = 1/√3', fill: TAN_COLOR },
        '(length of orange line)',
      ]}
    />
  </TikZ>
);

export default Demo;
