import { Fragment } from 'react';
import type { FC } from 'react';
import { Coordinate, Draw, Layout, Node, Path, Step } from '@retikz/react';

// 字面色而非 CSS var：SVG 下载后 CSS var 不在新上下文里解析，会 fallback 成黑
const MATH_FONT = {
  family: '"Latin Modern Math", "STIX Two Math", "Cambria Math", "Times New Roman", serif',
  style: 'italic' as const,
};

const COS30 = Math.cos((30 * Math.PI) / 180);
const SIN30 = Math.sin((30 * Math.PI) / 180);
const TAN30 = SIN30 / COS30;

const Demo: FC = () => (
  <Layout width={720} height={360}>
    {/* 背景网格 */}
    {[-100, -50, 0, 50, 100].map(v => (
      <Fragment key={`grid-${v}`}>
        <Draw way={[[v, -140], [v, 140]]} stroke="lightgray" strokeWidth={0.5} />
        <Draw way={[[-140, v], [140, v]]} stroke="lightgray" strokeWidth={0.5} />
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

    {/* 30° 扇形 + α */}
    <Path fill="lightgray" stroke="green">
      <Step kind="move" to={[0, 0]} />
      <Step kind="arc" startAngle={0} endAngle={-30} radius={30} />
      <Step kind="line" to={[0, 0]} />
    </Path>
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
      stroke="orange"
      thickness="thick"
    />
    <Coordinate id="t" position={[100, -TAN30 * 100]} />
    <Draw way={[[0, 0], 't']} />

    {/* 右侧信息说明框 —— LineSpec.fill 行级换色（行内片段着色暂不支持）。
        浅灰虚线边框 + 无填充：light/dark 主题都能看见，不抢主视觉；
        text 不放空 '' 分组行（空 tspan 的 dy advance 在浏览器间不稳，外框会撑出底部空白），
        视觉分组靠彩色公式行 + 默认色注释行的交替表达 */}
    <Node
      position={[320, 10]}
      shape="rectangle"
      stroke="lightgray"
      dashed
      roundedCorners={6}
      innerXSep={10}
      innerYSep={4}
      align="left"
      text={[
        { text: '角 α = 30°', fill: "green" },
        '即 π/6 弧度',
        { text: 'sin α = 1/2', fill: "red" },
        '（红线长度）',
        { text: 'cos α = √3/2', fill: "dodgerblue" },
        '（蓝线长度）',
        { text: 'tan α = 1/√3', fill: "orange" },
        '（橙线长度）',
      ]}
    />
  </Layout>
);

export default Demo;
