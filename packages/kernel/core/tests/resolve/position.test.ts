import { describe, expect, it } from 'vitest';

import type { BoundaryReferenceResolution, NodeReferenceView } from '../../src/resolve';
import type { PositionReferenceView, PositionTargetResolveContext } from '../../src/resolve/position';
import type { IRNodeTarget, IRPosition } from '../../src/schemas';

import { BUILTIN_SHAPES } from '../../src/providers/shape';
import { resolvePosition, resolvePositionTarget } from '../../src/resolve/position';

const rectangleBoundary: BoundaryReferenceResolution = {
  name: 'rectangle',
  definition: BUILTIN_SHAPES.rectangle,
  params: {},
  isShape: true,
};

const reference = (
  id: string,
  center: IRPosition,
  state: PositionReferenceView['state'] = 'resolved',
): PositionReferenceView => {
  const node: NodeReferenceView = {
    id,
    shapeName: 'rectangle',
    shapeDef: BUILTIN_SHAPES.rectangle,
    shapeParams: {},
    rect: { x: center[0], y: center[1], width: 20, height: 10 },
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    boundaryResolution: rectangleBoundary,
  };
  return { state, node };
};

const contextOf = (references: ReadonlyArray<PositionReferenceView> = []): PositionTargetResolveContext => {
  const byId = new Map(references.map(item => [item.node.id, item]));
  return {
    nodeDistance: 24,
    lookupReference: id => byId.get(id),
    toLocal: world => [world[0] - 100, world[1] - 50],
    toWorld: local => [local[0] + 100, local[1] + 50],
    boundaryResolutionOf: (_target, item) => item.node.boundaryResolution,
    pointOfNodeTarget: (target, item) => {
      if (target.anchor === 'right') {
        return [item.node.rect.x + item.node.rect.width / 2, item.node.rect.y];
      }
      return [item.node.rect.x, item.node.rect.y];
    },
  };
};

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
