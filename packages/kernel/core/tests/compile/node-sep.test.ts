import { describe, expect, it } from 'vitest';

import type { ScenePrimitive } from '../../src/contract';
import type { IRScene } from '../../src/schemas';

import { compileToScene } from '../../src/compile/compile';
import { NodeSchema } from '../../src/schemas';
import { line, move } from '../helpers/path-command-factory';

const findRect = (prims: Array<ScenePrimitive>) => prims.find(p => p.type === 'rect');

const rectSize = (ir: IRScene) => {
  const r = findRect(compileToScene(ir).primitives);
  return r?.type === 'rect' ? { w: r.width, h: r.height } : undefined;
};

describe('Node spacing（CSS-like padding / margin）', () => {
  it('拒绝已删除的 TikZ sep 字段', () => {
    expect(NodeSchema.safeParse({ type: 'node', position: [0, 0], innerXSep: 1 }).success).toBe(false);
    expect(NodeSchema.safeParse({ type: 'node', position: [0, 0], innerYSep: 1 }).success).toBe(false);
    expect(NodeSchema.safeParse({ type: 'node', position: [0, 0], outerSep: 1 }).success).toBe(false);
    expect(NodeSchema.safeParse({ type: 'node', position: [0, 0], paddingX: 1 }).success).toBe(false);
    expect(NodeSchema.safeParse({ type: 'node', position: [0, 0], marginRight: 1 }).success).toBe(false);
  });

  it('padding={p} 等价于 padding.default={p}', () => {
    const a: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'A', position: [0, 0], padding: 12 }],
    };
    const b: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [0, 0],
          padding: { default: 12 },
        },
      ],
    } as unknown as IRScene;
    expect(rectSize(a)).toEqual(rectSize(b));
  });

  it('padding.x / padding.y 分轴时 width / height 各自跟着 padding 变', () => {
    const wide: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [0, 0],
          padding: { x: 30, y: 4 },
        },
      ],
    } as unknown as IRScene;
    const tall: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [0, 0],
          padding: { x: 4, y: 30 },
        },
      ],
    } as unknown as IRScene;
    const w = rectSize(wide);
    const t = rectSize(tall);
    expect(w?.w).toBeGreaterThan(w!.h);
    expect(t?.h).toBeGreaterThan(t!.w);
    // 横向 vs 纵向对称：wide.width === tall.height 且 wide.height === tall.width
    expect(w?.w).toBe(t?.h);
    expect(w?.h).toBe(t?.w);
  });

  it('side-specific padding 优先于 axis-specific，再回退到 padding.default', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [0, 0],
          padding: { default: 8, x: 20, left: 30 },
        },
      ],
    } as unknown as IRScene;
    const sym: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [0, 0],
          padding: { left: 30, right: 20, top: 8, bottom: 8 },
        },
      ],
    } as unknown as IRScene;
    expect(rectSize(ir)).toEqual(rectSize(sym));
  });

  it('asymmetric padding keeps content at position and shifts the visual shape center', () => {
    const ir = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'A', position: [0, 0], padding: { left: 30, right: 10 } }],
    } as unknown as IRScene;
    const rect = findRect(compileToScene(ir).primitives);
    expect(
      rect?.type === 'rect' ? { left: rect.x, center: rect.x + rect.width / 2, width: rect.width } : undefined,
    ).toEqual({ left: -30, center: -10, width: 40 });
  });

  it('margin.x / margin.y 分轴外扩 border anchor', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0], margin: { x: 10, y: 4 } },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'A' } },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
      ],
    } as unknown as IRScene;
    const linePath = compileToScene(ir).primitives.find(p => p.type === 'path');
    if (linePath?.type === 'path') {
      // margin.x=10 → 横向端点 = 默认 padding 8 + 10 = 18
      expect(linePath.commands).toEqual([move([18, 0]), line([100, 0])]);
    }
  });

  it('side-specific margin 优先于 axis-specific，再回退到 margin.default', () => {
    const ir = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0], margin: { default: 4, x: 6, right: 10 } },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'A' } },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
      ],
    } as IRScene;
    const linePath = compileToScene(ir).primitives.find(p => p.type === 'path');
    if (linePath?.type === 'path') {
      // right 方向取 margin.right=10，端点 = 默认 padding 8 + 10 = 18
      expect(linePath.commands).toEqual([move([18, 0]), line([100, 0])]);
    }
  });

  it('未设任何 padding / margin → 走默认 (padding 默认 8，margin 默认 0)', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'A', position: [0, 0] }],
    };
    expect(rectSize(ir)).toEqual({ w: 16, h: 16 });
  });
});
