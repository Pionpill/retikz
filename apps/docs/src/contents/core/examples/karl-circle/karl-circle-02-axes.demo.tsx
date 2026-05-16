import type { FC } from 'react';
import { Coordinate, Draw, Node, Path, Step, TikZ } from '@retikz/react';

const UNIT = 100;
/** 数学坐标 → retikz 屏幕坐标：retikz 是 SVG y-down，TikZ 教程用数学 y-up；翻 y 符号 */
const cm = (x: number, y: number): [number, number] => [x * UNIT, -y * UNIT];

const Demo: FC = () => (
  <TikZ width={600} height={360}>
    {/* 单位圆 */}
    <Path lineCap="round">
      <Step kind="move" to={cm(0, 0)} />
      <Step kind="circlePath" radius={UNIT} />
    </Path>

    {/* x 轴：箭头 path + 端点 label + 命名锚 */}
    <Draw way={[cm(-1.5, 0), cm(1.5, 0)]} arrow="->" />
    <Node position={cm(1.62, 0)} stroke="none" padding={0}>x</Node>
    <Coordinate id="x-axis" position={cm(1.5, 0)} />

    {/* y 轴：同上 */}
    <Draw way={[cm(0, -1.5), cm(0, 1.5)]} arrow="->" />
    <Node position={cm(0, 1.62)} stroke="none" padding={0}>y</Node>
    <Coordinate id="y-axis" position={cm(0, 1.5)} />
  </TikZ>
);

export default Demo;
