import type { FC } from 'react';
import { Coordinate, Draw, Node, Path, Step, TikZ } from '@retikz/react';

const UNIT = 100;
/** 数学坐标 → retikz 屏幕坐标：retikz 是 SVG y-down，TikZ 教程用数学 y-up；翻 y 符号 */
const cm = (x: number, y: number): [number, number] => [x * UNIT, -y * UNIT];

/** 数学变量字体——LaTeX 习惯：变量用衬线斜体（Computer Modern italic 风格）；Latin Modern Math 缺失时回退到系统 STIX / Cambria / Times */
const MATH_FONT = {
  family: '"Latin Modern Math", "STIX Two Math", "Cambria Math", "Times New Roman", serif',
  style: 'italic' as const,
};

const Demo: FC = () => (
  <TikZ width={600} height={360}>
    {/* 单位圆 */}
    <Path lineCap="round">
      <Step kind="move" to={cm(0, 0)} />
      <Step kind="circlePath" radius={UNIT} />
    </Path>

    {/* x 轴：箭头 path + 端点 label + 命名锚 */}
    <Draw way={[cm(-1.5, 0), cm(1.5, 0)]} arrow="->" />
    <Node position={cm(1.62, 0)} stroke="none" padding={0} font={MATH_FONT}>x</Node>
    <Coordinate id="x-axis" position={cm(1.5, 0)} />

    {/* y 轴：同上 */}
    <Draw way={[cm(0, -1.5), cm(0, 1.5)]} arrow="->" />
    <Node position={cm(0, 1.62)} stroke="none" padding={0} font={MATH_FONT}>y</Node>
    <Coordinate id="y-axis" position={cm(0, 1.5)} />
  </TikZ>
);

export default Demo;
