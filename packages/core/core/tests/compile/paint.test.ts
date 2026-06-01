/**
 * Paint 编译：PaintSpec fill → 资源表 + resourceRef
 * @description node / path / scope 的 PaintSpec fill 收进 scene.resources（去重 + 稳定 id），primitive.fill 变 { kind:'resourceRef', id }；
 *   纯色 string 原样、不进资源表；同 spec 多处复用 → 1 条资源、同 id；scope fill 级联到内部 node；纯色与渐变同场景互不干扰。
 */
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR, IRPaintSpec } from '../../src/ir';
import type { RectPrim, ScenePrimitive } from '../../src/primitive';
import { flattenPrims } from '../helpers/flatten';

const grad: IRPaintSpec = {
  type: 'linearGradient',
  angle: 90,
  stops: [
    { offset: 0, color: '#4f8' },
    { offset: 1, color: '#08f' },
  ],
};

const rectsOf = (prims: Array<ScenePrimitive>): Array<RectPrim> =>
  flattenPrims(prims).filter((p): p is RectPrim => p.type === 'rect');

describe('node PaintSpec fill → 资源表 + resourceRef', () => {
  it('单 node gradient → primitive.fill = resourceRef + resources 1 条', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A', fill: grad }],
    };
    const scene = compileToScene(ir);
    const rect = rectsOf(scene.primitives)[0];
    expect(rect.fill).toEqual({ kind: 'resourceRef', id: 'paint-1' });
    expect(scene.resources).toEqual([{ kind: 'paint', id: 'paint-1', spec: grad }]);
  });

  it('纯色 string → primitive.fill 原样、resources 省略', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A', fill: 'lightblue' }],
    };
    const scene = compileToScene(ir);
    expect(rectsOf(scene.primitives)[0].fill).toBe('lightblue');
    expect(scene.resources).toBeUndefined();
  });
});

describe('去重 + 稳定 id', () => {
  it('两 node 同 gradient → 1 条资源、同 id', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0], text: 'A', fill: grad },
        { type: 'node', id: 'B', position: [60, 0], text: 'B', fill: grad },
      ],
    };
    const scene = compileToScene(ir);
    const rects = rectsOf(scene.primitives);
    expect(rects[0].fill).toEqual({ kind: 'resourceRef', id: 'paint-1' });
    expect(rects[1].fill).toEqual({ kind: 'resourceRef', id: 'paint-1' });
    expect(scene.resources).toHaveLength(1);
  });

  it('不同 gradient → 多条、不同 id', () => {
    const grad2: IRPaintSpec = { type: 'radialGradient', stops: grad.stops };
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0], text: 'A', fill: grad },
        { type: 'node', id: 'B', position: [60, 0], text: 'B', fill: grad2 },
      ],
    };
    const scene = compileToScene(ir);
    expect(scene.resources).toHaveLength(2);
    expect(scene.resources?.map(r => r.id)).toEqual(['paint-1', 'paint-2']);
  });

  it('同一 IR 编译两次 → 资源 id 完全一致（确定性）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A', fill: grad }],
    };
    expect(compileToScene(ir).resources).toEqual(compileToScene(ir).resources);
  });
});

describe('path PaintSpec fill', () => {
  it('path gradient fill → PathPrim.fill = resourceRef', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          fill: grad,
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
            { type: 'step', kind: 'line', to: [10, 10] },
            { type: 'step', kind: 'cycle' },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const path = flattenPrims(scene.primitives).find(p => p.type === 'path');
    expect(path?.type === 'path' && path.fill).toEqual({ kind: 'resourceRef', id: 'paint-1' });
    expect(scene.resources).toHaveLength(1);
  });
});

describe('交互：scope 级联 + 纯色/渐变共存', () => {
  it('scope fill 级联到内部无 fill node → 收进资源表（去重）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          fill: grad,
          children: [
            { type: 'node', id: 'A', position: [0, 0], text: 'A' },
            { type: 'node', id: 'B', position: [60, 0], text: 'B' },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const rects = rectsOf(scene.primitives);
    expect(rects[0].fill).toEqual({ kind: 'resourceRef', id: 'paint-1' });
    expect(rects[1].fill).toEqual({ kind: 'resourceRef', id: 'paint-1' });
    expect(scene.resources).toEqual([{ kind: 'paint', id: 'paint-1', spec: grad }]);
  });

  it('纯色与渐变同场景 → 纯色不进表、渐变进表，互不干扰', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0], text: 'A', fill: 'lightblue' },
        { type: 'node', id: 'B', position: [60, 0], text: 'B', fill: grad },
      ],
    };
    const scene = compileToScene(ir);
    const rects = rectsOf(scene.primitives);
    expect(rects[0].fill).toBe('lightblue');
    expect(rects[1].fill).toEqual({ kind: 'resourceRef', id: 'paint-1' });
    expect(scene.resources).toEqual([{ kind: 'paint', id: 'paint-1', spec: grad }]);
  });
});
