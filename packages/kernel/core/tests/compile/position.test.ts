import { describe, expect, it } from 'vitest';

import type { PositionReferenceView, PositionTargetResolveContext } from '../../src/compile';
import {
  composeScopeTransform,
  createNodeBoundaryStore,
  createPositionResolveContext,
  createSyntheticRectangleLayout,
  projectLayoutWithTransform,
  resolvePosition,
  resolvePositionTarget,
  resolveTransformTranslation,
} from '../../src/compile';
import type { CompiledNodeLayout } from '../../src/compile/node';
import { BUILTIN_SHAPES } from '../../src/providers';
import type { BoundaryResolution } from '../../src/resolve';
import type { IRNodeTarget, IRPosition, IRTransform } from '../../src/schemas';

const rectangleBoundary: BoundaryResolution = {
  name: 'rectangle',
  definition: BUILTIN_SHAPES.get('rectangle')!,
  params: {},
  isShape: true,
};

const reference = (
  id: string,
  center: IRPosition,
  state: PositionReferenceView['state'] = 'resolved',
): PositionReferenceView => {
  const node: CompiledNodeLayout = {
    shape: { name: 'rectangle', definition: BUILTIN_SHAPES.get('rectangle')!, params: {} },
    geometry: {
      rect: { x: center[0], y: center[1], width: 20, height: 10 },
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      contentCenter: center,
      contentSize: { width: 0, height: 0 },
    },
    boundary: rectangleBoundary,
  };
  return { state, node, id };
};

const contextOf = (references: ReadonlyArray<PositionReferenceView> = []): PositionTargetResolveContext => {
  const byId = new Map(references.map(item => [item.id, item]));
  return {
    nodeDistance: 24,
    lookupReference: id => byId.get(id),
    toLocal: world => [world[0] - 100, world[1] - 50],
    toWorld: local => [local[0] + 100, local[1] + 50],
    boundaryResolutionOf: (_target, item) => item.node.boundary,
    pointOfNodeTarget: (target, item) => {
      if (target.anchor === 'right') {
        return [item.node.geometry.rect.x + item.node.geometry.rect.width / 2, item.node.geometry.rect.y];
      }

      return [item.node.geometry.rect.x, item.node.geometry.rect.y];
    },
  };
};

describe('compiled layout references', () => {
  it('保留别名来源并直接复用布局，不修改共享诊断状态', () => {
    const layout = createSyntheticRectangleLayout({ id: 'A', rect: { x: 10, y: 20, width: 40, height: 20 } });
    const store = createNodeBoundaryStore();
    store.get(layout).irPath = ['original'];
    const paths: Array<unknown> = [];
    const context = createPositionResolveContext({
      nodeDistance: 24,
      nodeBoundaryStore: store,
      lookupReference: id => ({ state: 'resolved', layout, irPath: ['aliases', id] }),
      resolveExplicitBoundary: (_boundary, input) => {
        paths.push(input.irPath);
        return rectangleBoundary;
      },
    });
    for (const id of ['A', 'B']) {
      const result = resolvePositionTarget({ id, anchor: 'right', boundary: 'rectangle' }, context);
      expect(result.reference?.node).toBe(layout);
      expect(result.reference?.id).toBe(id);
      expect(result.reference?.irPath).toEqual(['aliases', id]);
      expect(result.point).toEqual([30, 20]);
    }
    expect(paths).toEqual([
      ['aliases', 'A'],
      ['aliases', 'B'],
    ]);
    expect(store.get(layout).irPath).toEqual(['original']);
  });

  it('重新发布变换后的布局时重新计算锚点', () => {
    const original = createSyntheticRectangleLayout({ id: 'A', rect: { x: 10, y: 20, width: 40, height: 20 } });
    let layout = original;
    const context = createPositionResolveContext({
      nodeDistance: 24,
      nodeBoundaryStore: createNodeBoundaryStore(),
      lookupReference: () => ({ state: 'resolved', layout }),
    });
    expect(resolvePositionTarget({ id: 'A', anchor: 'right' }, context).point).toEqual([30, 20]);
    layout = projectLayoutWithTransform(original, composeScopeTransform([{ kind: 'translate', x: 100, y: 50 }]));
    expect(resolvePositionTarget({ id: 'A', anchor: 'right' }, context).point).toEqual([130, 70]);
    expect(original.geometry.rect.x).toBe(10);
  });
});

describe('resolvePosition', () => {
  it('同时保留 tuple 的局部点与投影后的世界点', () => {
    expect(resolvePosition([5, 7], contextOf())).toEqual({ localPoint: [5, 7], worldPoint: [105, 57] });
  });

  it('把命名引用和 at 从世界中心反投影后应用局部距离', () => {
    const context = contextOf([reference('A', [120, 80])]);

    expect(resolvePosition('A', context)).toEqual({ localPoint: [20, 30], worldPoint: [120, 80] });
    expect(resolvePosition({ direction: 'right', of: 'A' }, context)).toEqual({
      localPoint: [44, 30],
      worldPoint: [144, 80],
    });
  });

  it('在局部空间递归应用 polar 与 OffsetPosition', () => {
    const context = contextOf();

    expect(resolvePosition({ origin: [10, 20], angle: 0, radius: 5 }, context)).toEqual({
      localPoint: [15, 20],
      worldPoint: [115, 70],
    });
    expect(resolvePosition({ of: { origin: [10, 20], angle: 90, radius: 5 }, offset: [2, 3] }, context)).toEqual({
      localPoint: [12, 28],
      worldPoint: [112, 78],
    });
  });

  it('引用不存在时返回 null', () => {
    expect(resolvePosition({ direction: 'top', of: 'missing' }, contextOf())).toBeNull();
  });
});

describe('resolvePositionTarget', () => {
  it('保留 reference 生命周期并在世界坐标叠加 NodeTarget offset', () => {
    const target: IRNodeTarget = { id: 'A', anchor: 'right', offset: [3, 4] };
    const result = resolvePositionTarget(target, contextOf([reference('A', [120, 80], 'scope-placeholder')]));

    expect(result.point).toEqual([33, 34]);
    expect(result.referencePoint).toEqual([133, 84]);
    expect(result.reference?.state).toBe('scope-placeholder');
    expect(result.boundaryResolution).toBe(rectangleBoundary);
  });

  it('在世界坐标递归解析 between 后投影到局部', () => {
    const result = resolvePositionTarget(
      { between: [{ id: 'A' }, { id: 'B', offset: [10, 0] }], fraction: 0.5 },
      contextOf([reference('A', [100, 50]), reference('B', [120, 70])]),
    );

    expect(result).toMatchObject({ point: [15, 10], referencePoint: [115, 60] });
  });

  it('absolute target 引用不存在时保留原 target 并返回 null 点', () => {
    const target: IRNodeTarget = { id: 'missing' };

    expect(resolvePositionTarget(target, contextOf())).toEqual({
      target,
      point: null,
      referencePoint: null,
    });
  });
});

describe('resolveTransformTranslation', () => {
  it('通过位置所属模块解析每个平移变换', () => {
    const base = contextOf([reference('A', [120, 80]), reference('B', [140, 100])]);
    const context: PositionTargetResolveContext = {
      ...base,
      resolveBetweenWorld: between => {
        const fraction = between.fraction;
        return [120 + (140 - 120) * fraction, 80 + (100 - 80) * fraction];
      },
    };
    const transforms: Array<Extract<IRTransform, { kind: `${string}translate` }>> = [
      { kind: 'translate', x: 3, y: 4 },
      { kind: 'polar-translate', origin: [10, 20], angle: 0, radius: 5 },
      { kind: 'at-translate', direction: 'right', of: 'A', distance: 10 },
      { kind: 'offset-translate', of: 'A' },
      { kind: 'between-translate', between: [{ id: 'A' }, { id: 'B' }], fraction: 0.25 },
    ];

    expect(transforms.map(transform => resolveTransformTranslation(transform, context)?.localPoint)).toEqual([
      [3, 4],
      [15, 20],
      [30, 30],
      [20, 30],
      [25, 35],
    ]);
  });

  it('当无法解析转换引用时返回 null', () => {
    expect(
      resolveTransformTranslation({ kind: 'at-translate', direction: 'top', of: 'missing' }, contextOf()),
    ).toBeNull();
  });
});
