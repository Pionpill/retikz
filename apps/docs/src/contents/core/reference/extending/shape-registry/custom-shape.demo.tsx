import { type PathCommand, type ShapeDefinition, localToWorld, worldToLocal } from '@retikz/core';
import { Draw, Node, TikZ } from '@retikz/react';
import type { FC } from 'react';

/**
 * 自定义 hexagon shape 注入 demo
 * @description 普通函数返回 ShapeDefinition（factory 模式）：circumscribe 用外接圆、emit 出 6 顶点 path、
 *   boundaryPoint 用外接圆近似（演示够用，真实 shape 应解多边形射线交边）、anchor 只认 center。
 *   <TikZ shapes={{ hexagon }}> 注入；IR 里 <Node shape="hexagon"> 只写字符串名。
 */
const createHexagon = (): ShapeDefinition => ({
  circumscribe: (hw, hh) => {
    const r = Math.hypot(hw, hh);
    return { halfWidth: r, halfHeight: r };
  },
  boundaryPoint: (rect, toward) => {
    const [lx, ly] = worldToLocal(rect, toward);
    const len = Math.hypot(lx, ly) || 1;
    const r = rect.width / 2;
    return localToWorld(rect, [(lx / len) * r, (ly / len) * r]);
  },
  anchor: (rect, name) => (name === 'center' ? [rect.x, rect.y] : undefined),
  *emit(rect, style, round) {
    const r = rect.width / 2;
    const commands: Array<PathCommand> = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2; // 第 0 顶点朝上
      const to: [number, number] = [round(rect.x + r * Math.cos(a)), round(rect.y + r * Math.sin(a))];
      commands.push(i === 0 ? { kind: 'move', to } : { kind: 'line', to });
    }
    commands.push({ kind: 'close' });
    yield {
      type: 'path',
      commands,
      fill: style.fill ?? 'transparent',
      stroke: style.stroke ?? 'currentColor',
      strokeWidth: style.strokeWidth ?? 1,
    };
  },
});

const hexagon = createHexagon();

const Demo: FC = () => (
  <TikZ width={420} height={180} shapes={{ hexagon }}>
    <Node id="a" shape="hexagon" position={[-90, 0]} text="A" fill="#e0ecff" stroke="#3b5bdb" strokeWidth={2} />
    <Node id="b" shape="hexagon" position={[90, 0]} text="B" fill="#fff0e0" stroke="#e8590c" strokeWidth={2} />
    <Draw way={['a', 'b']} arrow="->" />
  </TikZ>
);

export default Demo;
