import { Fragment } from 'react';
import type { FC } from 'react';
import { Circle, Coordinate, Draw, Grid, Layout, Node, Sector } from '@retikz/react';

// Literal colors instead of CSS vars: downloaded SVGs resolve `var(--x)` in a different
// context (or none), falling back to black; literal colors stay correct everywhere.
const MATH_FONT = {
  family: '"Latin Modern Math", "STIX Two Math", "Cambria Math", "Times New Roman", serif',
  style: 'italic' as const,
};

const COS30 = Math.cos((30 * Math.PI) / 180);
const SIN30 = Math.sin((30 * Math.PI) / 180);
const TAN30 = SIN30 / COS30;

const Demo: FC = () => (
  <Layout width={720} height={360}>
    {/* Background grid */}
    <Grid corner1={[-100, -100]} corner2={[100, 100]} step={50} stroke="lightgray" strokeWidth={0.5} />

    {/* Unit circle */}
    <Circle center={[0, 0]} radius={100} lineCap="round" />

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

    {/* 30° wedge + α */}
    <Sector center={[0, 0]} radius={30} startAngle={0} endAngle={-30} fill="lightgray" stroke="green" />
    <Node position={{ angle: -15, radius: 22 }} stroke="none" textColor="green" padding={1} font={MATH_FONT}>
      α
    </Node>

    {/* sin α / cos α / tan α */}
    <Draw
      way={[{ angle: -30, radius: 100 }, { label: { text: 'sin α', side: 'left' } }, [COS30 * 100, 0]]}
      stroke="red"
      thickness="thick"
    />
    <Draw
      way={[[COS30 * 100, 0], { label: { text: 'cos α', side: 'below' } }, [0, 0]]}
      stroke="dodgerblue"
      thickness="thick"
    />
    <Draw
      way={[[100, 0], { label: { text: 'tan α = sin α / cos α', side: 'right' } }, [100, -TAN30 * 100]]}
      stroke="darkorange"
      thickness="thick"
    />
    <Coordinate id="t" position={[100, -TAN30 * 100]} />
    <Draw way={[[0, 0], 't']} />

    {/* Right-hand info box — LineSpec.fill switches color per line (inline-span coloring not yet supported).
        Light-gray dashed border, no fill: visible in both light / dark themes without stealing focus */}
    <Node
      position={[380, 10]}
      shape="rectangle"
      stroke="lightgray"
      dashed
      roundedCorners={6}
      innerXSep={10}
      innerYSep={4}
      align="left"
      text={[
        { text: 'angle α = 30°', fill: "green" },
        '(π/6 in radians)',
        { text: 'sin α = 1/2', fill: "red" },
        '(length of red line)',
        { text: 'cos α = √3/2', fill: "dodgerblue" },
        '(length of dodgerblue line)',
        { text: 'tan α = 1/√3', fill: "darkorange" },
        '(length of darkorange line)',
      ]}
    />
  </Layout>
);

export default Demo;
