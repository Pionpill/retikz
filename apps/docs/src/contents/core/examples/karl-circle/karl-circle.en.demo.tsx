import { Fragment } from 'react';
import type { FC } from 'react';
import { Coordinate, Draw, Node, Path, Step, TikZ } from '@retikz/react';

/** 1 TikZ cm → 100 retikz user units (substitutes for TikZ `\begin{tikzpicture}[scale=3]`) */
const UNIT = 100;
/** Math coords → screen coords: retikz is SVG y-down, the TikZ tutorial uses math y-up; flip y sign */
const cm = (x: number, y: number): [number, number] => [x * UNIT, -y * UNIT];
/** Math polar → retikz PolarPosition: retikz angle is screen-down positive, so pass -degMath */
const polar = (degMath: number, r = 1) => ({ angle: -degMath, radius: r * UNIT });

// TikZ \colorlet aliases (IR has no color-alias system; constants substitute)
const ANGLE_STROKE = 'oklch(0.55 0.16 145)';
const ANGLE_FILL = 'oklch(0.92 0.10 145)';
const SIN_COLOR = '#ef4444';
const COS_COLOR = '#2563eb';
const TAN_COLOR = 'oklch(0.72 0.16 60)';
const HELP_LINE = 'oklch(0.85 0.04 250)';
const INFO_BG = 'oklch(0.96 0.04 25)';
const TICK_TEXT_BG = 'white';

const COS30 = Math.cos((30 * Math.PI) / 180);
const SIN30 = Math.sin((30 * Math.PI) / 180);
const TAN30 = SIN30 / COS30;

/**
 * retikz replication of the final unit-circle figure from tikz.dev/tutorial
 * @description sin / cos / tan geometry for a 30° angle; grid + axes + ticks + wedge + colored lines + info box. Since the current IR has no grid / projection target / name path, some details fall back to hand-computed coordinates.
 */
const Demo: FC = () => (
  <TikZ width={720} height={420}>
    {/* 1. Help-lines grid — current IR has no `grid` step; draw 5 horizontal + 5 vertical lines manually */}
    {[-1, -0.5, 0, 0.5, 1].map(v => (
      <Fragment key={`grid-${v}`}>
        <Draw way={[cm(v, -1.4), cm(v, 1.4)]} stroke={HELP_LINE} strokeWidth={0.5} />
        <Draw way={[cm(-1.4, v), cm(1.4, v)]} stroke={HELP_LINE} strokeWidth={0.5} />
      </Fragment>
    ))}

    {/* 2. Unit circle — circlePath uses the previous step's anchor as the center */}
    <Path lineCap="round">
      <Step kind="move" to={cm(0, 0)} />
      <Step kind="circlePath" radius={UNIT} />
    </Path>

    {/* 3. x / y axes + endpoint labels + named anchors (split into three: Draw + Node + Coordinate) */}
    <Draw way={[cm(-1.5, 0), cm(1.5, 0)]} arrow="->" />
    <Node position={cm(1.62, 0)} stroke="none" padding={0}>x</Node>
    <Coordinate id="x-axis" position={cm(1.5, 0)} />

    <Draw way={[cm(0, -1.5), cm(0, 1.5)]} arrow="->" />
    <Node position={cm(0, 1.62)} stroke="none" padding={0}>y</Node>
    <Coordinate id="y-axis" position={cm(0, 1.5)} />

    {/* 4. x-axis ticks (-1, -1/2, 1) — \foreach replaced by .map(); inline math falls back to plain text */}
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

    {/* y-axis ticks (-1, -1/2, 1/2, 1) */}
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

    {/* 5. 30° wedge (filldraw + arc)
        ArcStep takes the prev anchor as the center (TikZ instead takes prev as a point on the arc):
        move (0,0) → arc with center (0,0) → start point lands automatically at (radius, 0)
        line back to (0,0) so fill implicitly closes the wedge */}
    <Path fill={ANGLE_FILL} stroke={ANGLE_STROKE}>
      <Step kind="move" to={cm(0, 0)} />
      <Step kind="arc" startAngle={0} endAngle={-30} radius={30} />
      <Step kind="line" to={cm(0, 0)} />
    </Path>

    {/* α label */}
    <Node position={polar(15, 0.22)} stroke="none" textColor={ANGLE_STROKE} padding={1}>
      α
    </Node>

    {/* 6. sin α red vertical line ((30°,1) → projection onto x-axis) — IR has no projection target; hand-compute (cos30, 0) */}
    <Draw
      way={[polar(30, 1), { label: { text: 'sin α', side: 'left' } }, cm(COS30, 0)]}
      stroke={SIN_COLOR}
      thickness="veryThick"
    />

    {/* 7. cos α blue horizontal line (projection point → origin) */}
    <Draw
      way={[cm(COS30, 0), { label: { text: 'cos α', side: 'below' } }, cm(0, 0)]}
      stroke={COS_COLOR}
      thickness="veryThick"
    />

    {/* 8. tan α orange vertical line + auxiliary ray
        The original TikZ uses name path + intersections to find t; the IR doesn't support that.
        Geometrically the x=1 vertical line meets the 30° ray through the origin at (1, tan30) — feed it directly */}
    <Draw
      way={[cm(1, 0), { label: { text: 'tan α = sin α / cos α', side: 'right' } }, cm(1, TAN30)]}
      stroke={TAN_COLOR}
      thickness="veryThick"
    />
    <Coordinate id="t" position={cm(1, TAN30)} />
    <Draw way={[cm(0, 0), 't']} />

    {/* 9. Right-hand info box — LineSpec.fill switches color per line (inline-span coloring not yet supported) */}
    <Node
      position={cm(3.0, -0.1)}
      shape="rectangle"
      fill={INFO_BG}
      stroke="none"
      roundedCorners={6}
      padding={10}
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
