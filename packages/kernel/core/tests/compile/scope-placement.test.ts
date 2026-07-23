import { describe, expect, it } from 'vitest';

import type { CompiledNodeLayout, GroupPrim, IRScene, ScenePrimitive } from '../../src';

import { compileToScene } from '../../src';
import { applyTransformChain } from '../../src/compile/transform';

const scene = (children: IRScene['children']): IRScene => ({
  type: 'scene',
  version: 1,
  children,
});

const firstGroup = (primitives: ReadonlyArray<ScenePrimitive>): GroupPrim => {
  const group = primitives.find((primitive): primitive is GroupPrim => primitive.type === 'group');
  if (group === undefined) throw new Error('expected scope group');
  return group;
};

const node = (id: string, position: [number, number]) => ({
  type: 'node' as const,
  id,
  position,
  minimumSize: { width: 20, height: 10 },
  padding: 0,
  margin: 0,
});

describe('Scope placement 两阶段布局', () => {
  it('显式 parent-frame target + center selfAnchor 生成最外层 placement translate', () => {
    const compiled = compileToScene(
      scene([
        {
          type: 'scope',
          id: 'cluster',
          placement: { target: [100, 50] },
          children: [node('inside', [10, 20])],
        },
      ]),
    );

    expect(firstGroup(compiled.primitives).transforms).toEqual([{ kind: 'translate', x: 90, y: 30 }]);
  });

  it('placement.selfAnchor=top-left 使用包含 margin 的 intrinsic rectangle envelope', () => {
    const compiled = compileToScene(
      scene([
        {
          type: 'scope',
          placement: { target: [100, 50], selfAnchor: 'top-left' },
          children: [{ ...node('inside', [10, 20]), margin: 2 }],
        },
      ]),
    );

    expect(firstGroup(compiled.primitives).transforms).toEqual([{ kind: 'translate', x: 102, y: 37 }]);
  });

  it('NodeTarget 在 children 之前解析，offset 按 world user-units 只应用一次', () => {
    const compiled = compileToScene(
      scene([
        { type: 'coordinate', id: 'target', position: [100, 80] },
        {
          type: 'scope',
          placement: {
            target: { id: 'target', offset: [6, -2] },
            selfAnchor: 'origin',
          },
          children: [node('inside', [10, 20])],
        },
      ]),
    );

    expect(firstGroup(compiled.primitives).transforms).toEqual([{ kind: 'translate', x: 106, y: 78 }]);
  });

  it('placement.target 可引用此前完成的 Node 与 Scope anchor', () => {
    const compiled = compileToScene(
      scene([
        node('node-target', [40, 10]),
        {
          type: 'scope',
          placement: { target: { id: 'node-target', anchor: 'right' }, selfAnchor: 'origin' },
          children: [],
        },
        {
          type: 'scope',
          id: 'scope-target',
          children: [node('scope-child', [80, 20])],
        },
        {
          type: 'scope',
          placement: { target: { id: 'scope-target', anchor: 'right' }, selfAnchor: 'origin' },
          children: [],
        },
      ]),
    );
    const groups = compiled.primitives.filter((primitive): primitive is GroupPrim => primitive.type === 'group');

    expect(groups[0]?.transforms).toEqual([{ kind: 'translate', x: 50, y: 10 }]);
    expect(groups[2]?.transforms).toEqual([{ kind: 'translate', x: 90, y: 20 }]);
  });

  it('placement prepend 在 transform chain 第 0 项，pivot 仍由 placement 前 intrinsic envelope 求值', () => {
    const compiled = compileToScene(
      scene([
        {
          type: 'scope',
          placement: { target: [100, 50] },
          transforms: [
            { kind: 'rotate', degrees: 90, pivot: 'center' },
            { kind: 'scale', x: 2, y: 3, pivot: 'center' },
          ],
          children: [node('inside', [10, 20])],
        },
      ]),
    );

    expect(firstGroup(compiled.primitives).transforms).toEqual([
      { kind: 'translate', x: 90, y: 30 },
      { kind: 'rotate', degrees: 90, cx: 10, cy: 20 },
      { kind: 'translate', x: 10, y: 20 },
      { kind: 'scale', x: 2, y: 3 },
      { kind: 'translate', x: -10, y: -20 },
    ]);
  });

  it('空 Scope 的 center 退化到 origin，并仍注册最终 resolved target', () => {
    const compiled = compileToScene(
      scene([
        {
          type: 'scope',
          id: 'empty',
          placement: { target: [40, 30] },
          children: [],
        },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: { id: 'empty', anchor: 'center' } },
          ],
        },
      ]),
    );
    const path = compiled.primitives.find(
      (primitive): primitive is Extract<ScenePrimitive, { type: 'path' }> => primitive.type === 'path',
    );

    expect(firstGroup(compiled.primitives).transforms).toEqual([{ kind: 'translate', x: 40, y: 30 }]);
    expect(path?.commands).toContainEqual({ kind: 'line', to: [40, 30] });
  });

  it('circle envelope 的 selfAnchor 复用 intrinsic corner points 的最小外接圆', () => {
    const compiled = compileToScene(
      scene([
        {
          type: 'scope',
          boundingShape: 'circle',
          placement: { target: [100, 0], selfAnchor: 'right' },
          children: [node('left', [-10, 0]), node('right', [10, 0])],
        },
      ]),
    );

    expect(firstGroup(compiled.primitives).transforms?.[0]).toMatchObject({ kind: 'translate', y: 0 });
    expect(firstGroup(compiled.primitives).transforms?.[0]).toHaveProperty('x', 100 - Math.hypot(20, 5));
  });

  it.each([
    [
      'forward',
      [
        { type: 'scope', placement: { target: { id: 'later' } }, children: [] },
        { type: 'coordinate', id: 'later', position: [0, 0] },
      ],
    ],
    ['self', [{ type: 'scope', id: 'self', placement: { target: { id: 'self' } }, children: [] }]],
    [
      'descendant',
      [
        {
          type: 'scope',
          placement: { target: { id: 'inside' } },
          children: [{ type: 'coordinate', id: 'inside', position: [0, 0] }],
        },
      ],
    ],
    [
      'ancestor placeholder',
      [
        {
          type: 'scope',
          id: 'outer',
          children: [{ type: 'scope', placement: { target: { id: 'outer' } }, children: [] }],
        },
      ],
    ],
  ] as const)('%s Scope target fail-loud，不读取未完成 placeholder', (_name, children) => {
    expect(() => compileToScene(scene(children as unknown as IRScene['children']))).toThrow(/scope placement target/i);
  });

  it('空 Scope 的 {side,fraction} selfAnchor 沿用零尺寸 fail-loud', () => {
    expect(() =>
      compileToScene(
        scene([
          {
            type: 'scope',
            placement: {
              target: [0, 0],
              selfAnchor: { side: 'top', fraction: 0.5 },
            },
            children: [],
          },
        ]),
      ),
    ).toThrow(/zero-size target/);
  });

  it('Group、namespace target、observer 与 auto viewBox 只看到 own chain 应用一次后的最终几何', () => {
    const observed: Array<CompiledNodeLayout> = [];
    const compiled = compileToScene(
      scene([
        {
          type: 'scope',
          id: 'cluster',
          placement: { target: [100, 50] },
          transforms: [{ kind: 'rotate', degrees: 90, pivot: 'center' }],
          children: [node('inside', [10, 20])],
        },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: { id: 'inside', anchor: 'center' } },
          ],
        },
      ]),
      { padding: 0, onNodeLayout: layout => observed.push(layout) },
    );
    const group = firstGroup(compiled.primitives);
    const expectedCenter = applyTransformChain([10, 20], group.transforms ?? []);
    const path = compiled.primitives.find(
      (primitive): primitive is Extract<ScenePrimitive, { type: 'path' }> => primitive.type === 'path',
    );

    expect(expectedCenter).toEqual([100, 50]);
    expect(observed.find(layout => layout.id === 'inside')?.rect).toMatchObject({ x: 100, y: 50 });
    expect(path?.commands).toContainEqual({ kind: 'line', to: [100, 50] });
    expect(compiled.layout).toEqual({ x: 0, y: 0, width: 105, height: 60 });
  });

  it('嵌套 Scope 各自完成 pivot / placement，descendant namespace 与 observer 不重复应用 ancestor chain', () => {
    const observed: Array<CompiledNodeLayout> = [];
    const compiled = compileToScene(
      scene([
        {
          type: 'scope',
          id: 'outer',
          placement: { target: [100, 100] },
          transforms: [{ kind: 'rotate', degrees: 90, pivot: 'center' }],
          children: [
            {
              type: 'scope',
              id: 'inner',
              placement: { target: [20, 0] },
              transforms: [{ kind: 'scale', x: 2, pivot: 'center' }],
              children: [node('leaf', [10, 0])],
            },
          ],
        },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: { id: 'leaf', anchor: 'center' } },
          ],
        },
      ]),
      { onNodeLayout: layout => observed.push(layout) },
    );
    const path = compiled.primitives.find(
      (primitive): primitive is Extract<ScenePrimitive, { type: 'path' }> => primitive.type === 'path',
    );

    expect(observed.find(layout => layout.id === 'leaf')?.rect).toMatchObject({ x: 100, y: 100 });
    expect(path?.commands).toContainEqual({ kind: 'line', to: [100, 100] });
  });

  it('scaled parent 中 NodeTarget offset 保持 world user-units，只在投影前叠加一次', () => {
    const compiled = compileToScene(
      scene([
        { type: 'coordinate', id: 'target', position: [200, 100] },
        {
          type: 'scope',
          transforms: [{ kind: 'scale', x: 2 }],
          children: [
            {
              type: 'scope',
              id: 'placed',
              placement: {
                target: { id: 'target', offset: [10, 0] },
                selfAnchor: 'origin',
              },
              children: [],
            },
          ],
        },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: { id: 'placed', anchor: 'center' } },
          ],
        },
      ]),
    );
    const path = compiled.primitives.find(
      (primitive): primitive is Extract<ScenePrimitive, { type: 'path' }> => primitive.type === 'path',
    );

    expect(path?.commands).toContainEqual({ kind: 'line', to: [210, 100] });
  });
});

describe('Scope zero-scale 反投影契约', () => {
  it('纯视觉 zero scale 合法', () => {
    expect(() =>
      compileToScene(
        scene([
          {
            type: 'scope',
            transforms: [{ kind: 'scale', x: 0 }],
            children: [node('inside', [10, 20])],
          },
        ]),
      ),
    ).not.toThrow();
  });

  it('跨 zero-scale ancestor chain 解析外部 target 时稳定抛错', () => {
    expect(() =>
      compileToScene(
        scene([
          { type: 'coordinate', id: 'outside', position: [20, 30] },
          {
            type: 'scope',
            transforms: [{ kind: 'scale', x: 0 }],
            children: [
              {
                type: 'scope',
                placement: { target: { id: 'outside' } },
                children: [],
              },
            ],
          },
        ]),
      ),
    ).toThrow('non-invertible scope transform');
  });
});
