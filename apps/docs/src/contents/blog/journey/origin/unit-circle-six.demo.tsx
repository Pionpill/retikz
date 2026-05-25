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
const SEC30 = 1 / COS30;     // x 轴上的截距 = 1/cos(α)
const CSC30 = 1 / SIN30;     // y 轴上的截距 = 1/sin(α)
const COT30 = 1 / TAN30;     // 顶部水平切线与原点射线的距离 = 1/tan(α)

const Demo: FC = () => (
  <Layout width={760} height={480}>
    {/* 背景网格 */}
    {[-100, -50, 0, 50, 100].map(v => (
      <Fragment key={`grid-${v}`}>
        <Draw way={[[v, -210], [v, 140]]} stroke="lightgray" strokeWidth={0.5} />
        <Draw way={[[-140, v], [140, v]]} stroke="lightgray" strokeWidth={0.5} />
      </Fragment>
    ))}

    {/* 单位圆 */}
    <Path lineCap="round">
      <Step kind="move" to={[0, 0]} />
      <Step kind="circlePath" radius={100} />
    </Path>

    {/* 坐标轴：y 轴上端拉到 -230 以容纳 csc α = 2 端点 (0, -200) */}
    <Draw way={[[-150, 0], [150, 0]]} arrow="->" />
    <Node position={[162, 0]} stroke="none" padding={0} font={MATH_FONT}>x</Node>
    <Coordinate id="x-axis" position={[150, 0]} />
    <Draw way={[[0, 150], [0, -230]]} arrow="->" />
    <Node position={[0, -242]} stroke="none" padding={0} font={MATH_FONT}>y</Node>
    <Coordinate id="y-axis" position={[0, -230]} />

    {/* 刻度：y 轴多加一个 2（位置 -200）方便看 csc 端点 */}
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
      { y: -200, text: '2' },
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

    {/* 从原点穿过 P 的射线（延伸到 (cot α · 100, -100)）——cot 几何定义的基准；
        虚线 currentColor：跟着主题深浅自适应，又一眼能看出是辅助线 */}
    <Draw way={[[0, 0], [COT30 * 100, -100]]} dashPattern={[3, 3]} />

    {/* sin α 红 / cos α 蓝 / tan α 橙；label.textColor 与线色一致 */}
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
      way={[[100, 0], { label: { text: 'tan α', side: 'right' } }, [100, -TAN30 * 100]]}
      stroke="darkorange"
      thickness="thick"
    />

    {/* sec α 紫：切线下半段，P → x 轴截距 (sec α · 100, 0)；
        标签锚到段末 + side='below'，落到 x 轴下方，避开 tan α 的 right 侧标签 */}
    <Draw
      way={[
        { angle: -30, radius: 100 },
        { label: { text: 'sec α', position: 'at-end', side: 'below' } },
        [SEC30 * 100, 0],
      ]}
      stroke="dodgerblue"
      thickness="thick"
    />

    {/* csc α 粉：切线上半段，P → y 轴截距 (0, -csc α · 100) */}
    <Draw
      way={[
        { angle: -30, radius: 100 },
        { label: { text: 'csc α', side: 'left' } },
        [0, -CSC30 * 100],
      ]}
      stroke="red"
      thickness="thick"
    />

    {/* cot α 青：顶部水平切线段，(0, -100) → (cot α · 100, -100) */}
    <Draw
      way={[
        [0, -100],
        { label: { text: 'cot α', side: 'above' } },
        [COT30 * 100, -100],
      ]}
      stroke="green"
      thickness="thick"
    />

    {/* 右侧信息说明框：6 个三角函数的值 + α */}
    <Node
      position={[320, -70]}
      shape="rectangle"
      stroke="lightgray"
      dashed
      roundedCorners={6}
      innerXSep={10}
      innerYSep={4}
      align="left"
      text={[
        { text: 'α = 30°', fill: "green" },
        { text: 'sin α = 1/2', fill: "red" },
        { text: 'cos α = √3/2', fill: "dodgerblue" },
        { text: 'tan α = 1/√3', fill: "darkorange" },
        { text: 'sec α = 2/√3', fill: "dodgerblue" },
        { text: 'csc α = 2', fill: "red" },
        { text: 'cot α = √3', fill: "green" },
      ]}
    />
  </Layout>
);

export default Demo;
