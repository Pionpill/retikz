import { Fragment } from 'react';
import type { FC } from 'react';
import { Circle, Coordinate, Draw, Grid, Layout, Node, Sector } from '@retikz/react';

// 字面色而非 CSS var：SVG 下载后 CSS var 不在新上下文里解析，会 fallback 成黑
const MATH_FONT = {
  family: '"Latin Modern Math", "STIX Two Math", "Cambria Math", "Times New Roman", serif',
  style: 'italic' as const,
};

const COS30 = Math.cos((30 * Math.PI) / 180);
const SIN30 = Math.sin((30 * Math.PI) / 180);
const TAN30 = SIN30 / COS30;

const Demo: FC = () => (
  <Layout width={600} height={360}>
    {/* 背景网格 */}
    <Grid corner1={[-100, -100]} corner2={[100, 100]} step={50} stroke="lightgray" strokeWidth={0.5} />

    {/* 单位圆 */}
    <Circle center={[0, 0]} radius={100} lineCap="round" />

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

    {/* 30° 扇形 + α */}
    <Sector center={[0, 0]} radius={30} startAngle={0} endAngle={-30} fill="lightgray" stroke="green" />
    <Node position={{ angle: -15, radius: 22 }} stroke="none" textColor="green" padding={1} font={MATH_FONT}>
      α
    </Node>

    {/* sin α / cos α */}
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

    {/* tan α 橙色竖线 + 辅助射线
        原 TikZ 用 name path + name intersections 求交点；IR 没建模，几何上
        x=100 竖线与原点 30° 射线交于 (100, -TAN30·100)（screen y），直接喂坐标。
        Coordinate t 命名供下方 ray 引用 */}
    <Draw
      way={[[100, 0], { label: { text: 'tan α = sin α / cos α', side: 'right' } }, [100, -TAN30 * 100]]}
      stroke="orange"
      thickness="thick"
    />
    <Coordinate id="t" position={[100, -TAN30 * 100]} />
    {/* 原点 → t 的辅助射线 */}
    <Draw way={[[0, 0], 't']} />
  </Layout>
);

export default Demo;
