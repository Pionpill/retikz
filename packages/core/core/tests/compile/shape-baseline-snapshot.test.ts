import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR } from '../../src/ir';

/**
 * Shape Registry 重构的「逐字节」回归网
 * @description 在重构前捕获一张覆盖 4 内置 shape 全路径（circumscribe / emit / boundaryPoint /
 *   命名 anchor / 数字角度 / rotate / margin）的 Scene 快照。把 shape 从硬编码 switch 抽成
 *   ShapeDefinition 注册项后，本快照必须逐字节不变——证明纯重构无行为漂移。
 *   只 import compileToScene（重构无关），故可在重构前先跑出基线 .snap。
 */
const richIR: IR = {
  version: 1,
  type: 'scene',
  children: [
    // rectangle：圆角 + 旋转 + 外边距 + 全套样式
    {
      type: 'node',
      id: 'r',
      shape: 'rectangle',
      position: [0, 0],
      text: 'Rect',
      rotate: 30,
      roundedCorners: 3,
      outerSep: 5,
      fill: 'lightblue',
      stroke: 'navy',
      strokeWidth: 2,
      fillOpacity: 0.8,
    },
    // circle：外接圆
    { type: 'node', id: 'c', shape: 'circle', position: [120, 0], text: 'C', fill: 'pink' },
    // ellipse：宽文本让 rx > ry
    { type: 'node', id: 'e', shape: 'ellipse', position: [240, 0], text: 'ellipse text' },
    // diamond：旋转（走 unrotated + 外层 group）
    { type: 'node', id: 'd', shape: 'diamond', position: [0, 120], text: 'D', rotate: 15 },
    // 空 rectangle（最小尺寸）+ 多行 + label
    {
      type: 'node',
      id: 'p',
      position: [120, 120],
      text: ['line1', 'line2'],
      label: { text: 'tag', position: 'above' },
    },
    // boundary clip：r（带 margin）→ c
    { type: 'path', children: [{ type: 'step', kind: 'move', to: { id: 'r' } }, { type: 'step', kind: 'line', to: { id: 'c' } }] },
    // 命名 anchor：d.north → e.south
    { type: 'path', children: [{ type: 'step', kind: 'move', to: { id: 'd', anchor: 'north' } }, { type: 'step', kind: 'line', to: { id: 'e', anchor: 'south' } }] },
    // 数字角度：c.30
    { type: 'path', children: [{ type: 'step', kind: 'move', to: { id: 'c', anchor: 30 } }, { type: 'step', kind: 'line', to: [300, 300] }] },
  ],
};

describe('Shape baseline snapshot (byte-for-byte regression net)', () => {
  it('rich multi-shape scene stays identical across the registry refactor', () => {
    const scene = compileToScene(richIR, { precision: 4 });
    expect(scene).toMatchSnapshot();
  });
});
