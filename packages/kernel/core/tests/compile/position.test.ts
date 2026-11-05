import { describe, expect, it } from 'vitest';

import type { PositionReferenceState, PositionReferenceView, PositionTargetEvaluateContext } from '../../src/compile';
import {
  composeScopeTransform,
  createPositionEvaluateContext,
  evaluatePosition,
  evaluatePositionTarget,
} from '../../src/compile';
import { createBoundaryStore, projectLayoutWithTransform } from '../../src/compile/boundary';
import type { CompiledNodeLayout } from '../../src/compile/node';
import { evaluateTransformTranslation } from '../../src/compile/scope';
import { BUILTIN_SHAPES } from '../../src/providers';
import type { CanonicalNodeBoundary } from '../../src/resolve';
import type { IRNodeTarget, IRPosition, IRTransform } from '../../src/schemas';

const rectangleBoundary: CanonicalNodeBoundary = {
  name: 'rectangle',
  definition: BUILTIN_SHAPES.get('rectangle')!,
  params: {},
  isShape: true,
};

const rectangleLayout = (): CompiledNodeLayout => ({
  shape: { name: 'rectangle', definition: BUILTIN_SHAPES.get('rectangle')!, params: {} },
  boundary: rectangleBoundary,
  geometry: {
    rect: { x: 10, y: 20, width: 40, height: 20 },
    contentCenter: [10, 20],
    contentSize: { width: 40, height: 20 },
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  },
});

const reference = (
  id: string,
  center: IRPosition,
  state: PositionReferenceState = 'resolved',
): PositionReferenceView & { id: string } => {
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
  return { state, geometry: node, id };
};

const contextOf = (
  references: ReadonlyArray<PositionReferenceView & { id: string }> = [],
): PositionTargetEvaluateContext => {
  const byId = new Map(references.map(item => [item.id, item]));
  return {
    nodeDistance: 24,
    lookupReference: id => byId.get(id),
    toLocal: world => [world[0] - 100, world[1] - 50],
    toWorld: local => [local[0] + 100, local[1] + 50],
    bindNodeTargetBoundary: (_target, item) => ('position' in item.geometry ? undefined : item.geometry.boundary),
    evaluateNodeTargetPoint: (target, item) => {
      if ('position' in item.geometry) return item.geometry.position;
      if (target.anchor === 'right') {
        return [item.geometry.geometry.rect.x + item.geometry.geometry.rect.width / 2, item.geometry.geometry.rect.y];
      }

      return [item.geometry.geometry.rect.x, item.geometry.geometry.rect.y];
    },
  };
};

describe('compiled layout references', () => {
  it('保留别名来源并直接复用布局，不修改共享诊断状态', () => {
    const layout = rectangleLayout();
    const store = createBoundaryStore();
    store.getOrCreateState(layout.shape).irPath = ['original'];
    const paths: Array<unknown> = [];
    const references = new Map<string, PositionReferenceView>(
      ['A', 'B'].map(id => [id, { state: 'resolved', geometry: layout, irPath: ['aliases', id] }]),
    );
    const context = createPositionEvaluateContext({
      nodeDistance: 24,
      boundaryStore: store,
      lookupReference: id => references.get(id),
      resolveExplicitBoundary: (_boundary, input) => {
        paths.push(input.irPath);
        return rectangleBoundary;
      },
    });
    for (const id of ['A', 'B']) {
      const result = evaluatePositionTarget({ id, anchor: 'right', boundary: 'rectangle' }, context);
      expect(result.reference).toBe(references.get(id));
      expect(result.reference?.geometry).toBe(layout);
      expect(result.reference?.irPath).toEqual(['aliases', id]);
      expect(result.point).toEqual([30, 20]);
    }
    expect(paths).toEqual([
      ['aliases', 'A'],
      ['aliases', 'B'],
    ]);
    expect(store.getOrCreateState(layout.shape).irPath).toEqual(['original']);
  });

  it('重新发布变换后的布局时重新计算锚点', () => {
    const original = rectangleLayout();
    let layout = original;
    const context = createPositionEvaluateContext({
      nodeDistance: 24,
      boundaryStore: createBoundaryStore(),
      lookupReference: () => ({ state: 'resolved', geometry: layout }),
    });
    expect(evaluatePositionTarget({ id: 'A', anchor: 'right' }, context).point).toEqual([30, 20]);
    layout = projectLayoutWithTransform(original, composeScopeTransform([{ kind: 'translate', x: 100, y: 50 }]));
    expect(evaluatePositionTarget({ id: 'A', anchor: 'right' }, context).point).toEqual([130, 70]);
    expect(original.geometry.rect.x).toBe(10);
  });
});

describe('evaluatePosition', () => {
  it('同时保留 tuple 的局部点与投影后的世界点', () => {
    expect(evaluatePosition([5, 7], contextOf())).toEqual({ localPoint: [5, 7], worldPoint: [105, 57] });
  });

  it('把命名引用和 at 从世界中心反投影后应用局部距离', () => {
    const context = contextOf([reference('A', [120, 80])]);

    expect(evaluatePosition('A', context)).toEqual({ localPoint: [20, 30], worldPoint: [120, 80] });
    expect(evaluatePosition({ direction: 'right', of: 'A' }, context)).toEqual({
      localPoint: [44, 30],
      worldPoint: [144, 80],
    });
  });

  it('在局部空间递归应用 polar 与 OffsetPosition', () => {
    const context = contextOf();

    expect(evaluatePosition({ origin: [10, 20], angle: 0, radius: 5 }, context)).toEqual({
      localPoint: [15, 20],
      worldPoint: [115, 70],
    });
    expect(evaluatePosition({ of: { origin: [10, 20], angle: 90, radius: 5 }, offset: [2, 3] }, context)).toEqual({
      localPoint: [12, 28],
      worldPoint: [112, 78],
    });
  });

  it('引用不存在时返回 null', () => {
    expect(evaluatePosition({ direction: 'top', of: 'missing' }, contextOf())).toBeNull();
  });
});

describe('evaluatePositionTarget', () => {
  it('保留 reference 生命周期并在世界坐标叠加 NodeTarget offset', () => {
    const target: IRNodeTarget = { id: 'A', anchor: 'right', offset: [3, 4] };
    const result = evaluatePositionTarget(target, contextOf([reference('A', [120, 80], 'scope-placeholder')]));

    expect(result.point).toEqual([33, 34]);
    expect(result.referencePoint).toEqual([133, 84]);
    expect(result.reference?.state).toBe('scope-placeholder');
    expect(result.canonicalBoundary).toBe(rectangleBoundary);
  });

  it('在世界坐标递归解析 between 后投影到局部', () => {
    const result = evaluatePositionTarget(
      { between: [{ id: 'A' }, { id: 'B', offset: [10, 0] }], fraction: 0.5 },
      contextOf([reference('A', [100, 50]), reference('B', [120, 70])]),
    );

    expect(result).toMatchObject({ point: [15, 10], referencePoint: [115, 60] });
  });

  it('absolute target 引用不存在时保留原 target 并返回 null 点', () => {
    const target: IRNodeTarget = { id: 'missing' };

    expect(evaluatePositionTarget(target, contextOf())).toEqual({
      target,
      point: null,
      referencePoint: null,
    });
  });
});

describe('evaluateTransformTranslation', () => {
  it('按当前坐标系解析每种平移变换', () => {
    const base = contextOf([reference('A', [120, 80]), reference('B', [140, 100])]);
    const context: PositionTargetEvaluateContext = {
      ...base,
      evaluateBetweenWorld: between => {
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

    expect(transforms.map(transform => evaluateTransformTranslation(transform, context)?.localPoint)).toEqual([
      [3, 4],
      [15, 20],
      [30, 30],
      [20, 30],
      [25, 35],
    ]);
  });

  it('当无法解析转换引用时返回 null', () => {
    expect(
      evaluateTransformTranslation({ kind: 'at-translate', direction: 'top', of: 'missing' }, contextOf()),
    ).toBeNull();
  });
});
