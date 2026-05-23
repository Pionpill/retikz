import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR } from '../../src/ir';

const scene = (children: IR['children']): IR => ({ version: 1, type: 'scene', children });
const silent = { onWarn: () => {} };

describe('emitNodePrimitives：带文本 Node 包 <g>', () => {
  // Happy path
  it('带文本 Node → 单个 GroupPrim（无旋转时无 transform）', () => {
    const ir = scene([{ type: 'node', position: [0, 0], text: 'A' }]);
    const prims = compileToScene(ir, silent).primitives;
    expect(prims).toHaveLength(1);
    expect(prims[0].type).toBe('group');
    if (prims[0].type !== 'group') throw new Error('expected group');
    expect(prims[0].transforms).toBeUndefined();
    expect(prims[0].children.map(c => c.type)).toEqual(['rect', 'text']);
  });

  it('纯几何 Node（无文本）→ 平铺，不包 group', () => {
    const ir = scene([{ type: 'node', position: [0, 0] }]);
    expect(compileToScene(ir, silent).primitives.map(p => p.type)).toEqual(['rect']);
  });

  it('带文本 + 旋转 Node → group 带 rotate transform', () => {
    const ir = scene([{ type: 'node', position: [0, 0], text: 'A', rotate: 45 }]);
    const prims = compileToScene(ir, silent).primitives;
    expect(prims[0].type).toBe('group');
    if (prims[0].type !== 'group') throw new Error('expected group');
    expect(prims[0].transforms?.[0]).toMatchObject({ kind: 'rotate', degrees: 45 });
  });

  // 边界
  it('多行文本 Node → 单个 group，children = rect + text', () => {
    const ir = scene([{ type: 'node', position: [0, 0], text: ['A', 'B'] }]);
    const prims = compileToScene(ir, silent).primitives;
    expect(prims[0].type).toBe('group');
    if (prims[0].type !== 'group') throw new Error('expected group');
    expect(prims[0].children.map(c => c.type)).toEqual(['rect', 'text']);
  });

  it('circle 带文本 Node → group children = ellipse + text', () => {
    const ir = scene([{ type: 'node', position: [0, 0], shape: 'circle', text: 'A' }]);
    const prims = compileToScene(ir, silent).primitives;
    expect(prims[0].type).toBe('group');
    if (prims[0].type !== 'group') throw new Error('expected group');
    expect(prims[0].children.map(c => c.type)).toEqual(['ellipse', 'text']);
  });

  // 结构不变量（无 schema 拒绝路径，用判据守卫替代）
  it('纯几何带样式 Node 仍不包 group（仅 lines 触发，样式不触发）', () => {
    const ir = scene([{ type: 'node', position: [0, 0], fill: '#eee', minimumSize: 2 }]);
    expect(compileToScene(ir, silent).primitives.map(p => p.type)).toEqual(['rect']);
  });

  it('空字符串 text 仍包 group（判据严格是 layout.lines !== undefined）', () => {
    const ir = scene([{ type: 'node', position: [0, 0], text: '' }]);
    const prims = compileToScene(ir, silent).primitives;
    expect(prims[0].type).toBe('group');
    if (prims[0].type !== 'group') throw new Error('expected group');
    expect(prims[0].children.map(c => c.type)).toEqual(['rect', 'text']);
  });

  // 交互
  it('带文本 + label → label TextPrim 在该 node 的 group 内', () => {
    const ir = scene([{ type: 'node', position: [0, 0], text: 'A', label: { text: 'L' } }]);
    const prims = compileToScene(ir, silent).primitives;
    expect(prims[0].type).toBe('group');
    if (prims[0].type !== 'group') throw new Error('expected group');
    // group 内：shape rect + 主文本 text + label text
    const texts = prims[0].children.filter(c => c.type === 'text');
    expect(texts.length).toBe(2);
  });

  it('带文本 Node 设 zIndex → 整个 group 作为一个单位排序（与 ADR-02 交互）', () => {
    const ir = scene([
      { type: 'node', position: [0, 0], text: 'A', zIndex: 5 },
      { type: 'node', position: [20, 0] }, // 纯几何 rect，默认 0
    ]);
    const prims = compileToScene(ir, silent).primitives;
    // 纯几何 rect（z=0）在前，带文本 group（z=5）在后
    expect(prims.map(p => p.type)).toEqual(['rect', 'group']);
  });
});
