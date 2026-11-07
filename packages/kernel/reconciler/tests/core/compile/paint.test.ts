import { describe, expect, it } from 'vitest';

import { createPaintRegistry } from '../../../../core/src/compile/resource';
import type { PathPrimitive, RectPrimitive, ScenePrimitive } from '../../../../core/src/contract';
import { definePattern } from '../../../../core/src/contract';
import { resolvePaint } from '../../../../core/src/resolve/resource/paint';
import type { IRPaint, IRScene } from '../../../../core/src/schemas';
import { compileToScene } from '../../../src/compile';
import { createSharedCompileContext } from '../../../src/compile';
import { flattenPrims } from '../../helpers/flatten';
import { pathArrows } from '../../helpers/path-arrows';

const grad: IRPaint = {
  kind: 'linearGradient',
  angle: 90,
  stops: [
    { offset: 0, color: '#4f8' },
    { offset: 1, color: '#08f' },
  ],
};

describe('绘制资源内容身份', () => {
  it('内容决定身份，注册顺序和对象字段顺序不影响结果', () => {
    const first = createPaintRegistry(value => value);
    const second = createPaintRegistry(value => value);
    const original = first.register({ kind: 'paint', spec: grad });
    const reversed = second.register({ kind: 'paint', spec: { ...grad, stops: [...grad.stops].reverse() } });
    const reordered = second.register({
      kind: 'paint',
      spec: {
        stops: grad.stops.map(stop => ({ color: stop.color, offset: stop.offset })),
        angle: 90,
        kind: 'linearGradient',
      },
    });
    expect(reordered).toEqual(original);
    expect(reversed).not.toEqual(original);
    expect(first.importResource(second.getResources()[1])).toEqual(original);
    expect(first.getResources()).toHaveLength(1);
  });

  it('导入保留身份，后续登记相同内容不新增资源', () => {
    const source = createPaintRegistry(value => value);
    const original = source.register({ kind: 'paint', spec: grad });
    const registry = createPaintRegistry(value => value);
    const resource = source.getResources()[0];
    expect(registry.importResource(resource)).toEqual(original);
    expect(registry.register({ kind: 'paint', spec: grad })).toEqual(original);
    expect(registry.getResources()).toEqual([resource]);
    expect(registry.getResources()[0]).toBe(resource);
  });

  it('同一身份对应冲突内容时明确失败', () => {
    const registry = createPaintRegistry(value => value);
    registry.register({ kind: 'paint', spec: grad });
    const resource = registry.getResources()[0];
    expect(() => registry.importResource({ ...resource, spec: { ...grad, angle: 45 } })).toThrow(/conflicting content/);
  });

  it('导入相同声明的图案后，仍按本地 provider 生成内容身份', () => {
    const spec: IRPaint = { kind: 'pattern', shape: 'custom' };
    const resolve = (fill: string) => {
      const shared = createSharedCompileContext({
        patterns: [
          definePattern({ name: 'custom', emit: () => [{ type: 'rect', x: 0, y: 0, width: 1, height: 1, fill }] }),
        ],
      });
      return resolvePaint(spec, { patternRegistry: shared.registries.patternRegistry, round: shared.layout.round });
    };
    const source = createPaintRegistry(value => value);
    const original = source.register(resolve('red'));
    const registry = createPaintRegistry(value => value);
    registry.importResource(source.getResources()[0]);
    const local = registry.register(resolve('blue'));
    expect(local).not.toEqual(original);
    expect(registry.register(resolve('blue'))).toEqual(local);
    expect(registry.getResources()).toHaveLength(2);
  });
});

const rectsOf = (prims: Array<ScenePrimitive>): Array<RectPrimitive> =>
  flattenPrims(prims).filter((p): p is RectPrimitive => p.type === 'rect');

const pathsOf = (prims: Array<ScenePrimitive>): Array<PathPrimitive> =>
  flattenPrims(prims).filter((p): p is PathPrimitive => p.type === 'path');

describe('node IRPaint fill → 资源表 + resourceRef', () => {
  it('单 node gradient → primitive.fill = resourceRef + resources 1 条', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [0, 0],
          text: 'A',
          style: { fill: grad },
        },
      ],
    };
    const scene = compileToScene(ir).scene;
    const rect = rectsOf(scene.primitives)[0];

    expect(rect.fill).toEqual({
      kind: 'resourceRef',
      id: scene.resources!.filter(resource => resource.kind === 'paint')[0].id,
    });
    expect(scene.resources).toEqual([
      { kind: 'paint', id: scene.resources!.filter(resource => resource.kind === 'paint')[0].id, spec: grad },
    ]);
  });

  it('纯色 string → primitive.fill 原样、resources 省略', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [0, 0],
          text: 'A',
          style: { fill: 'lightblue' },
        },
      ],
    };
    const scene = compileToScene(ir).scene;

    expect(rectsOf(scene.primitives)[0].fill).toBe('lightblue');
    expect(scene.resources).toBeUndefined();
  });
});

describe('去重 + 稳定 id', () => {
  it('两 node 同 gradient → 1 条资源、同 id', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [0, 0],
          text: 'A',
          style: { fill: grad },
        },
        {
          type: 'node',
          id: 'B',
          position: [60, 0],
          text: 'B',
          style: { fill: grad },
        },
      ],
    };
    const scene = compileToScene(ir).scene;
    const rects = rectsOf(scene.primitives);

    expect(rects[0].fill).toEqual({
      kind: 'resourceRef',
      id: scene.resources!.filter(resource => resource.kind === 'paint')[0].id,
    });
    expect(rects[1].fill).toEqual({
      kind: 'resourceRef',
      id: scene.resources!.filter(resource => resource.kind === 'paint')[0].id,
    });
    expect(scene.resources).toHaveLength(1);
  });

  it('不同 gradient → 多条、不同 id', () => {
    const grad2: IRPaint = { kind: 'radialGradient', stops: grad.stops };
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [0, 0],
          text: 'A',
          style: { fill: grad },
        },
        {
          type: 'node',
          id: 'B',
          position: [60, 0],
          text: 'B',
          style: { fill: grad2 },
        },
      ],
    };
    const scene = compileToScene(ir).scene;

    expect(scene.resources).toHaveLength(2);
    expect(scene.resources?.map(r => r.id)).toEqual([
      scene.resources!.filter(resource => resource.kind === 'paint')[0].id,
      scene.resources!.filter(resource => resource.kind === 'paint')[1].id,
    ]);
  });

  it('同一 IR 编译两次 → 资源 id 完全一致（确定性）', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [0, 0],
          text: 'A',
          style: { fill: grad },
        },
      ],
    };

    expect(compileToScene(ir).scene.resources).toEqual(compileToScene(ir).scene.resources);
  });
});

describe('IRPaint 填充路径', () => {
  it('路径渐变填充→PathPrimitive.fill = resourceRef', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
            { type: 'step', kind: 'line', to: [10, 10] },
            { type: 'step', kind: 'cycle' },
          ],
          style: { fill: grad },
        },
      ],
    };
    const scene = compileToScene(ir).scene;
    const path = flattenPrims(scene.primitives).find(p => p.type === 'path');

    expect(path?.type === 'path' && path.fill).toEqual({
      kind: 'resourceRef',
      id: scene.resources!.filter(resource => resource.kind === 'paint')[0].id,
    });
    expect(scene.resources).toHaveLength(1);
  });
});

describe('交互：scope 级联 + 纯色/渐变共存', () => {
  it('scope fill 级联到内部无 fill node → 收进资源表（去重）', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          children: [
            { type: 'node', id: 'A', position: [0, 0], text: 'A' },
            { type: 'node', id: 'B', position: [60, 0], text: 'B' },
          ],
          defaults: { style: { fill: grad } },
        },
      ],
    };
    const scene = compileToScene(ir).scene;
    const rects = rectsOf(scene.primitives);

    expect(rects[0].fill).toEqual({
      kind: 'resourceRef',
      id: scene.resources!.filter(resource => resource.kind === 'paint')[0].id,
    });
    expect(rects[1].fill).toEqual({
      kind: 'resourceRef',
      id: scene.resources!.filter(resource => resource.kind === 'paint')[0].id,
    });
    expect(scene.resources).toEqual([
      { kind: 'paint', id: scene.resources!.filter(resource => resource.kind === 'paint')[0].id, spec: grad },
    ]);
  });

  it('纯色与渐变同场景 → 纯色不进表、渐变进表，互不干扰', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [0, 0],
          text: 'A',
          style: { fill: 'lightblue' },
        },
        {
          type: 'node',
          id: 'B',
          position: [60, 0],
          text: 'B',
          style: { fill: grad },
        },
      ],
    };
    const scene = compileToScene(ir).scene;
    const rects = rectsOf(scene.primitives);

    expect(rects[0].fill).toBe('lightblue');
    expect(rects[1].fill).toEqual({
      kind: 'resourceRef',
      id: scene.resources!.filter(resource => resource.kind === 'paint')[0].id,
    });
    expect(scene.resources).toEqual([
      { kind: 'paint', id: scene.resources!.filter(resource => resource.kind === 'paint')[0].id, spec: grad },
    ]);
  });
});

describe('stroke IRPaint → 资源表 + resourceRef', () => {
  it('路径行程 linearGradient→PathPrimitive.stroke = resourceRef', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
          style: { stroke: grad },
        },
      ],
    };
    const scene = compileToScene(ir).scene;

    expect(pathsOf(scene.primitives)[0].stroke).toEqual({
      kind: 'resourceRef',
      id: scene.resources!.filter(resource => resource.kind === 'paint')[0].id,
    });
    expect(scene.resources).toEqual([
      { kind: 'paint', id: scene.resources!.filter(resource => resource.kind === 'paint')[0].id, spec: grad },
    ]);
  });

  it('节点行程 radialGradient → RectPrimitive.stroke = resourceRef', () => {
    const radial: IRPaint = { kind: 'radialGradient', stops: grad.stops };
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [0, 0],
          text: 'A',
          style: { stroke: radial },
        },
      ],
    };
    const scene = compileToScene(ir).scene;

    expect(rectsOf(scene.primitives)[0].stroke).toEqual({
      kind: 'resourceRef',
      id: scene.resources!.filter(resource => resource.kind === 'paint')[0].id,
    });
    expect(scene.resources).toEqual([
      { kind: 'paint', id: scene.resources!.filter(resource => resource.kind === 'paint')[0].id, spec: radial },
    ]);
  });

  it('scope stroke IRPaint 级联到 node/path，并共用同一个 resourceRef', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          children: [
            { type: 'node', id: 'A', position: [0, 0], text: 'A' },
            {
              type: 'path',
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [10, 0] },
              ],
            },
          ],
          defaults: { style: { stroke: grad } },
        },
      ],
    };
    const scene = compileToScene(ir).scene;

    expect(rectsOf(scene.primitives)[0].stroke).toEqual({
      kind: 'resourceRef',
      id: scene.resources!.filter(resource => resource.kind === 'paint')[0].id,
    });
    expect(pathsOf(scene.primitives)[0].stroke).toEqual({
      kind: 'resourceRef',
      id: scene.resources!.filter(resource => resource.kind === 'paint')[0].id,
    });
    expect(scene.resources).toHaveLength(1);
  });

  it('fill 与 stroke 使用同一 IRPaint → 资源去重', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
            { type: 'step', kind: 'line', to: [10, 10] },
            { type: 'step', kind: 'cycle' },
          ],
          style: { fill: grad, stroke: grad },
        },
      ],
    };
    const scene = compileToScene(ir).scene;
    const path = pathsOf(scene.primitives)[0];

    expect(path.fill).toEqual({
      kind: 'resourceRef',
      id: scene.resources!.filter(resource => resource.kind === 'paint')[0].id,
    });
    expect(path.stroke).toEqual({
      kind: 'resourceRef',
      id: scene.resources!.filter(resource => resource.kind === 'paint')[0].id,
    });
    expect(scene.resources).toHaveLength(1);
  });

  it('纯色 stroke 保持原样、不进入 resources', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
          style: { stroke: '#333' },
        },
      ],
    };
    const scene = compileToScene(ir).scene;

    expect(pathsOf(scene.primitives)[0].stroke).toBe('#333');
    expect(scene.resources).toBeUndefined();
  });

  it('stroke undefined 不生成 paint resource', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    const scene = compileToScene(ir).scene;

    expect(pathsOf(scene.primitives)[0].stroke).toBe('currentColor');
    expect(scene.resources).toBeUndefined();
  });

  it('arrow × gradient stroke：未覆盖箭头颜色时复用路径绘制资源', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: pathArrows('->'),
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
          style: { stroke: grad },
        },
      ],
    };

    const scene = compileToScene(ir).scene;
    const path = pathsOf(scene.primitives)[0];

    expect(path.stroke).toEqual({
      kind: 'resourceRef',
      id: scene.resources!.filter(resource => resource.kind === 'paint')[0].id,
    });
    expect(path.arrowEnd?.marker[0]).toMatchObject({ fill: { kind: 'contextStroke' } });
    expect(scene.resources).toEqual([
      { kind: 'paint', id: scene.resources!.filter(resource => resource.kind === 'paint')[0].id, spec: grad },
    ]);
  });

  it('arrow × gradient stroke：显式 arrowDetail.color 时允许，marker 使用纯色', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: pathArrows('->', { color: '#111' }),
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
          style: { stroke: grad },
        },
      ],
    };
    const scene = compileToScene(ir).scene;
    const path = pathsOf(scene.primitives)[0];

    expect(path.stroke).toEqual({
      kind: 'resourceRef',
      id: scene.resources!.filter(resource => resource.kind === 'paint')[0].id,
    });
    expect(path.arrowEnd?.marker[0]).toMatchObject({ fill: '#111' });
  });
});
