import { describe, expect, it } from 'vitest';
import { strictObject } from 'zod';

import type { CompiledNodeLayout, CompileOptions } from '../../src/compile';
import type { RectPrim } from '../../src/contract';
import type { IRNode, IRScene } from '../../src/schemas';
import type { Rect } from '../../src/shared/geometry';

import { compileToScene, isNodeLayoutCompileArtifact } from '../../src/compile';
import { defineBoundary } from '../../src/contract';
import { rect as rectOps } from '../../src/shared/geometry';
import { flattenPrims } from '../helpers/flatten';

const scene = (children: IRScene['children']): IRScene => ({ type: 'scene', version: 1, children });

const compileLayouts = (ir: IRScene, options: CompileOptions = {}): Map<string, CompiledNodeLayout> => {
  const layouts = new Map<string, CompiledNodeLayout>();
  const result = compileToScene(ir, {
    ...options,
    artifacts: { nodeLayouts: true },
  });
  for (const artifact of result.artifacts.filter(isNodeLayoutCompileArtifact)) {
    if (artifact.value.id !== undefined) layouts.set(artifact.value.id, artifact.value);
  }
  return layouts;
};

const inflatedRect = (layout: CompiledNodeLayout, marginX: number, marginY = marginX): Rect => ({
  ...layout.rect,
  width: layout.rect.width + marginX * 2,
  height: layout.rect.height + marginY * 2,
});

describe('Node anchor-to-anchor position', () => {
  it('Node → Node 默认以双方 center 对齐', () => {
    const layouts = compileLayouts(
      scene([
        { type: 'node', id: 'target', position: [30, 40], minimumSize: 20, padding: 0 },
        {
          type: 'node',
          id: 'current',
          position: { kind: 'anchor', target: { id: 'target' } },
          minimumSize: 40,
          padding: 0,
        },
      ]),
    );

    expect(layouts.get('current')?.rect).toMatchObject({ x: 30, y: 40 });
  });

  it('Node → Coordinate 默认 center 对齐', () => {
    const layouts = compileLayouts(
      scene([
        { type: 'coordinate', id: 'target', position: [12, -8] },
        {
          type: 'node',
          id: 'current',
          position: { kind: 'anchor', target: { id: 'target' } },
          minimumSize: 20,
          padding: 0,
        },
      ]),
    );

    expect(layouts.get('current')?.rect).toMatchObject({ x: 12, y: -8 });
  });

  it('target bottom-left → self top-left，再叠加世界坐标 offset', () => {
    const layouts = compileLayouts(
      scene([
        { type: 'node', id: 'target', position: [0, 0], minimumSize: 20, padding: 0 },
        {
          type: 'node',
          id: 'current',
          position: {
            kind: 'anchor',
            target: { id: 'target', anchor: 'bottom-left', offset: [5, -2] },
            selfAnchor: 'top-left',
          },
          minimumSize: 20,
          padding: 0,
        },
      ]),
    );

    const target = layouts.get('target')!;
    const current = layouts.get('current')!;
    const targetPoint = rectOps.anchor(target.rect, 'bottom-left');
    const selfPoint = rectOps.anchor(current.rect, 'top-left');
    expect(selfPoint[0]).toBeCloseTo(targetPoint[0] + 5, 8);
    expect(selfPoint[1]).toBeCloseTo(targetPoint[1] - 2, 8);
  });

  it('先完成 padding、margin、scale、rotate，再按有效边界整体平移', () => {
    const margin = 7;
    const layouts = compileLayouts(
      scene([
        {
          type: 'node',
          id: 'target',
          position: [25, 35],
          text: 'target',
          padding: { left: 3, right: 9, top: 4, bottom: 10 },
          margin,
          scale: { x: 1.5, y: 0.75 },
          rotate: 25,
        },
        {
          type: 'node',
          id: 'current',
          position: {
            kind: 'anchor',
            target: { id: 'target', anchor: 'bottom-left', offset: [11, -6] },
            selfAnchor: 'top-left',
          },
          text: 'current node',
          padding: { left: 8, right: 2, top: 6, bottom: 12 },
          margin,
          scale: { x: 0.8, y: 1.4 },
          rotate: -30,
        },
      ]),
    );

    const target = layouts.get('target')!;
    const current = layouts.get('current')!;
    const targetPoint = rectOps.anchor(inflatedRect(target, margin * 1.5, margin * 0.75), 'bottom-left');
    const selfPoint = rectOps.anchor(inflatedRect(current, margin * 0.8, margin * 1.4), 'top-left');
    expect(selfPoint[0]).toBeCloseTo(targetPoint[0] + 11, 8);
    expect(selfPoint[1]).toBeCloseTo(targetPoint[1] - 6, 8);
  });

  it('在嵌套 Scope transform 中仍按全局锚点对齐', () => {
    const layouts = compileLayouts(
      scene([
        { type: 'node', id: 'target', position: [15, -25], minimumSize: 20, padding: 0 },
        {
          type: 'scope',
          transforms: [{ kind: 'translate', x: 30, y: 10 }],
          children: [
            {
              type: 'scope',
              transforms: [
                { kind: 'rotate', degrees: 37 },
                { kind: 'scale', x: 1.5, y: 0.5 },
              ],
              children: [
                {
                  type: 'node',
                  id: 'current',
                  position: { kind: 'anchor', target: { id: 'target' } },
                  minimumSize: 30,
                  padding: 0,
                },
              ],
            },
          ],
        },
      ]),
    );

    expect(layouts.get('current')?.rect.x).toBeCloseTo(15, 8);
    expect(layouts.get('current')?.rect.y).toBeCloseTo(-25, 8);
  });

  it('允许引用已解析 Scope', () => {
    const layouts = compileLayouts(
      scene([
        {
          type: 'scope',
          id: 'resolved',
          children: [{ type: 'node', position: [60, 45], minimumSize: 20, padding: 0 }],
        },
        {
          type: 'node',
          id: 'current',
          position: { kind: 'anchor', target: { id: 'resolved' } },
          minimumSize: 10,
          padding: 0,
        },
      ]),
    );

    expect(layouts.get('current')?.rect).toMatchObject({ x: 60, y: 45 });
  });

  it('允许引用已解析的零尺寸空 Scope', () => {
    const layouts = compileLayouts(
      scene([
        {
          type: 'scope',
          id: 'empty',
          transforms: [{ kind: 'translate', x: 23, y: 17 }],
          children: [],
        },
        {
          type: 'node',
          id: 'current',
          position: { kind: 'anchor', target: { id: 'empty' } },
          minimumSize: 10,
          padding: 0,
        },
      ]),
    );

    expect(layouts.get('current')?.rect).toMatchObject({ x: 23, y: 17 });
  });

  it('连续 A → B → C 不读取 provisional anchor 缓存', () => {
    const layouts = compileLayouts(
      scene([
        { type: 'node', id: 'A', position: [0, 0], minimumSize: 20, padding: 0 },
        {
          type: 'node',
          id: 'B',
          position: {
            kind: 'anchor',
            target: { id: 'A', anchor: 'right' },
            selfAnchor: 'left',
          },
          minimumSize: 30,
          padding: 0,
        },
        {
          type: 'node',
          id: 'C',
          position: {
            kind: 'anchor',
            target: { id: 'B', anchor: 'right' },
            selfAnchor: 'left',
          },
          minimumSize: 40,
          padding: 0,
        },
      ]),
    );

    expect(layouts.get('B')?.rect.x).toBeCloseTo(25, 8);
    expect(layouts.get('C')?.rect.x).toBeCloseTo(60, 8);
  });

  it('复用注册的 custom boundary anchor', () => {
    const wideBoundary = defineBoundary({
      name: 'wide',
      paramsSchema: strictObject({}),
      resolveRect: context => ({ ...context.visualRect, width: 120, height: 20 }),
      boundaryPoint: rect => [rect.x, rect.y],
      anchor: (rect, name) => (name === 'right' ? [rect.x + rect.width / 2, rect.y] : undefined),
    });
    const layouts = compileLayouts(
      scene([
        { type: 'node', id: 'target', position: [0, 0], minimumSize: 20, padding: 0 },
        {
          type: 'node',
          id: 'current',
          position: { kind: 'anchor', target: { id: 'target', anchor: 'right', boundary: 'wide' } },
          minimumSize: 20,
          padding: 0,
        },
      ]),
      { boundaries: [wideBoundary] },
    );

    expect(layouts.get('current')?.rect).toMatchObject({ x: 60, y: 0 });
  });

  it('当前 Node 无 id 时仍可对齐已完成 target', () => {
    const result = compileToScene(
      scene([
        { type: 'node', id: 'target', position: [18, 27], minimumSize: 20, padding: 0 },
        {
          type: 'node',
          position: { kind: 'anchor', target: { id: 'target' } },
          minimumSize: 10,
          padding: 0,
        },
      ]),
      { artifacts: { nodeLayouts: true } },
    );
    const observed = result.artifacts.filter(isNodeLayoutCompileArtifact).map(artifact => artifact.value);

    expect(observed[1].id).toBeUndefined();
    expect(observed[1].rect).toMatchObject({ x: 18, y: 27 });
  });

  it('local namespace 的同名 resolved target 遮蔽外层 target', () => {
    const layouts = compileLayouts(
      scene([
        { type: 'node', id: 'target', position: [0, 0], minimumSize: 20, padding: 0 },
        {
          type: 'scope',
          localNamespace: true,
          children: [
            { type: 'node', id: 'target', position: [90, 55], minimumSize: 20, padding: 0 },
            {
              type: 'node',
              id: 'current',
              position: { kind: 'anchor', target: { id: 'target' } },
              minimumSize: 10,
              padding: 0,
            },
          ],
        },
      ]),
    );

    expect(layouts.get('current')?.rect).toMatchObject({ x: 90, y: 55 });
  });

  it('Scene primitive、observer 与自动 viewBox 只看到最终几何', () => {
    const result = compileToScene(
      scene([
        { type: 'node', id: 'target', position: [100, 50], minimumSize: 20, padding: 0 },
        {
          type: 'node',
          id: 'current',
          position: { kind: 'anchor', target: { id: 'target' } },
          minimumSize: 20,
          padding: 0,
        },
      ]),
      { padding: 0, artifacts: { nodeLayouts: true } },
    );
    const output = result.scene;
    const observed = result.artifacts.filter(isNodeLayoutCompileArtifact).map(artifact => artifact.value);
    const currentPrimitive = flattenPrims(output.primitives).find(
      (primitive): primitive is RectPrim => primitive.type === 'rect' && primitive.id === 'current',
    );

    expect(observed[1].rect).toMatchObject({ x: 100, y: 50 });
    expect(currentPrimitive).toMatchObject({ x: 90, y: 40, width: 20, height: 20 });
    expect(output.layout.x).toBeGreaterThan(50);
  });
});

describe('Node anchor-to-anchor position fail-loud', () => {
  it('拒绝 undefined target', () => {
    expect(
      () =>
        compileToScene(
          scene([{ type: 'node', id: 'current', position: { kind: 'anchor', target: { id: 'missing' } } }]),
        ).scene,
    ).toThrow(/anchor position target 'missing'.*undefined or defined later/i);
  });

  it('拒绝 later target', () => {
    expect(
      () =>
        compileToScene(
          scene([
            { type: 'node', id: 'current', position: { kind: 'anchor', target: { id: 'later' } } },
            { type: 'node', id: 'later', position: [0, 0] },
          ]),
        ).scene,
    ).toThrow(/anchor position target 'later'.*undefined or defined later/i);
  });

  it('拒绝 self target', () => {
    expect(
      () =>
        compileToScene(scene([{ type: 'node', id: 'self', position: { kind: 'anchor', target: { id: 'self' } } }]))
          .scene,
    ).toThrow(/anchor position.*cannot reference itself/i);
  });

  it('拒绝尚未完成布局的祖先 Scope placeholder', () => {
    expect(
      () =>
        compileToScene(
          scene([
            {
              type: 'scope',
              id: 'open',
              children: [
                {
                  type: 'node',
                  id: 'current',
                  position: {
                    kind: 'anchor',
                    target: { id: 'open', anchor: 'right', boundary: 'missing-boundary' },
                  },
                },
              ],
            },
          ]),
        ).scene,
    ).toThrow(/anchor position target 'open'.*Scope.*still being laid out/i);
  });

  it('拒绝当前 Scope chain 中的零缩放轴', () => {
    expect(
      () =>
        compileToScene(
          scene([
            { type: 'node', id: 'target', position: [0, 0] },
            {
              type: 'scope',
              transforms: [{ kind: 'scale', x: 0 }],
              children: [{ type: 'node', id: 'current', position: { kind: 'anchor', target: { id: 'target' } } }],
            },
          ]),
        ).scene,
    ).toThrow(/anchor position.*zero scale axis/i);
  });

  it('拒绝零尺寸 resolved Scope 的边上比例 anchor', () => {
    expect(
      () =>
        compileToScene(
          scene([
            { type: 'scope', id: 'empty', children: [] },
            {
              type: 'node',
              id: 'current',
              position: {
                kind: 'anchor',
                target: { id: 'empty', anchor: { side: 'top', fraction: 0.5 } },
              },
            },
          ]),
        ).scene,
    ).toThrow(/zero-size target/i);
  });

  it('未知 anchor 与 boundary 保持既有 provider 诊断', () => {
    const target: IRNode = { type: 'node', id: 'target', position: [0, 0] };
    expect(
      () =>
        compileToScene(
          scene([
            target,
            {
              type: 'node',
              position: { kind: 'anchor', target: { id: 'target', anchor: 'missing-anchor' } },
            },
          ]),
        ).scene,
    ).toThrow(/Unknown anchor 'missing-anchor'/);

    expect(
      () =>
        compileToScene(
          scene([
            target,
            {
              type: 'node',
              position: {
                kind: 'anchor',
                target: { id: 'target', anchor: 'right', boundary: 'missing-boundary' },
              },
            },
          ]),
        ).scene,
    ).toThrow(/Unknown connection surface provider 'missing-boundary'/);
  });
});
