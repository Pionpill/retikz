import { Fragment } from 'react';
import type { FC } from 'react';
import { Circle, Coordinate, Draw, Grid, Layout, Node, Sector } from '@retikz/react';

// 字面色而非 CSS var：SVG 下载后 CSS var 不在新上下文里解析，会 fallback 成黑
const MATH_FONT = {
  family: '"Latin Modern Math", "STIX Two Math", "Cambria Math", "Times New Roman", serif',
  style: 'italic' as const,
};

const COS30 = Math.cos((30 * Math.PI) / 180);

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

    {/* 30° 扇形 + α 标签 */}
    <Sector center={[0, 0]} radius={30} startAngle={0} endAngle={-30} fill="lightgray" stroke="green" />
    <Node position={{ angle: -15, radius: 22 }} stroke="none" textColor="green" padding={1} font={MATH_FONT}>
      α
    </Node>

    {/* sin α 红色竖线：从圆周 (30°, 100px) 垂直落到 x 轴投影点 (cos30·100, 0)
        IR 还没投影 target，手算投影坐标兜底；label 用 Draw way 内的 { label } 算子 */}
    <Draw
      way={[{ angle: -30, radius: 100 }, { label: { text: 'sin α', side: 'left' } }, [COS30 * 100, 0]]}
      stroke="red"
      thickness="thick"
    />

    {/* cos α 蓝色横线：投影点 → 原点 */}
    <Draw
      way={[[COS30 * 100, 0], { label: { text: 'cos α', side: 'below' } }, [0, 0]]}
      stroke="blue"
      thickness="thick"
    />
  </Layout>
);

export default Demo;
