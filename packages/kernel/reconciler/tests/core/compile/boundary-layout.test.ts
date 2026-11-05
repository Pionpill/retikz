import { createBoundaryStore } from '@retikz/core';
import type { NodeCompileContext } from '@retikz/core';
import { describe, expect, it, vi } from 'vitest';

import {
  boundaryPointOf,
  projectLayoutWithTransform,
  getOrCreateNamedAnchor,
} from '../../../../core/src/compile/boundary';
import { layoutNode } from '../../../../core/src/compile/node';
import { createPositionEvaluateContext } from '../../../../core/src/compile/reference';
import { composeScopeTransform } from '../../../../core/src/compile/shared';
import { resolveBoundaryRegistry, resolvePatternRegistry, resolveShapeRegistry } from '../../../../core/src/providers';
import { resolveNode } from '../../../../core/src/resolve';

const measureText = (): { width: number; height: number; ascent: number } => ({
  width: 10,
  height: 10,
  ascent: 8,
});

const layoutOf = (
  source: Parameters<typeof resolveNode>[0],
  shapes = resolveShapeRegistry(),
  context: Partial<NodeCompileContext> = {},
) => {
  const boundaries = resolveBoundaryRegistry();
  const resolution = resolveNode(source, {
    nodeDistance: 24,
    rootFontSize: 16,
    gatingOn: false,
    scopeDefaults: {},
    mode: 'light',
    shapeRegistry: shapes,
    boundaryRegistry: boundaries,
    patternRegistry: resolvePatternRegistry(),
    round: value => value,
    irPath: [],
    warn: () => {},
    labelDistance: 12,
  });

  return {
    ...layoutNode(resolution, {
      measureText,
      positionContext: createPositionEvaluateContext({ lookupReference: () => undefined, nodeDistance: 24 }),
      ...context,
    }),
  };
};

describe('CompiledNodeLayout 边界/形状', () => {
  it('直接布局自身锚点时无缓存状态也能定位并保留回退诊断', () => {
    const shapes = new Map(resolveShapeRegistry());
    shapes.set('rectangle', { ...shapes.get('rectangle')!, computeConnectionEnvelope: undefined });
    const warn = vi.fn();
    const layout = layoutOf(
      {
        type: 'node',
        boundary: 'circle',
        position: { kind: 'anchor', target: { id: 'target' }, selfAnchor: 'right' },
      },
      shapes,
      {
        warn,
        irPath: ['children', 0],
        positionContext: createPositionEvaluateContext({
          nodeDistance: 24,
          lookupReference: () => ({ state: 'resolved', geometry: { position: [100, 0] } }),
        }),
      },
    );
    expect(getOrCreateNamedAnchor(layout, 'right')).toEqual([100, 0]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][1]).toContain('falling back');
  });

  it('连接面消费上下文在布局投影和引用视图间共享缓存，并区分几何位置', () => {
    const shapes = new Map(resolveShapeRegistry());
    const rectangle = shapes.get('rectangle')!;
    const envelope = vi.fn(() => ({ halfWidth: 30, halfHeight: 30 }));
    shapes.set('rectangle', { ...rectangle, computeConnectionEnvelope: envelope });
    const layout = layoutOf({ type: 'node', position: [0, 0], boundary: 'circle' }, shapes);
    const context = createBoundaryStore();
    const projected = projectLayoutWithTransform(layout, composeScopeTransform([]));
    const first = boundaryPointOf(layout, [100, 0], 'circle', undefined, undefined, context.get(layout.shape));
    expect(boundaryPointOf(projected, [100, 0], 'circle', undefined, undefined, context.get(projected.shape))).toEqual(
      first,
    );
    expect(envelope).toHaveBeenCalledTimes(1);

    const moved = projectLayoutWithTransform(layout, composeScopeTransform([{ kind: 'translate', x: 10, y: 0 }]));
    expect(boundaryPointOf(moved, [100, 0], 'circle', undefined, undefined, context.get(moved.shape))[0]).toBe(
      first[0] + 10,
    );
    expect(envelope).toHaveBeenCalledTimes(2);
  });

  it('同一节点变换后的 tight fallback 警告只发一次，不同编译上下文独立', () => {
    const shapes = new Map(resolveShapeRegistry());
    shapes.set('rectangle', { ...shapes.get('rectangle')!, computeConnectionEnvelope: undefined });
    const layout = layoutOf({ type: 'node', position: [0, 0], boundary: 'circle' }, shapes);
    const warn = vi.fn();
    const context = createBoundaryStore();
    context.get(layout.shape).warn = warn;
    const moved = projectLayoutWithTransform(layout, composeScopeTransform([{ kind: 'translate', x: 10, y: 0 }]));
    boundaryPointOf(layout, [100, 0], 'circle', undefined, undefined, context.get(layout.shape));
    boundaryPointOf(moved, [100, 0], 'circle', undefined, undefined, context.get(moved.shape));
    expect(warn).toHaveBeenCalledTimes(1);

    const another = createBoundaryStore();
    another.get(layout.shape).warn = warn;
    boundaryPointOf(layout, [100, 0], 'circle', undefined, undefined, another.get(layout.shape));
    expect(warn).toHaveBeenCalledTimes(2);
  });
  it('未指定 boundary 时 layout.boundary 为 undefined，shapes 指向传入注册表', () => {
    const shapes = resolveShapeRegistry();
    const layout = layoutOf({ type: 'node', id: 'a', shape: 'rectangle', position: [0, 0] }, shapes);

    expect(layout.boundary.definition).toBe(layout.shape.definition);
    expect(layout.shape.definition).toBe(shapes.get('rectangle'));
  });

  it('IR node.boundary = "circle" 时 layout.boundary 携带该值', () => {
    const shapes = resolveShapeRegistry();
    const layout = layoutOf(
      { type: 'node', id: 'a', shape: 'rectangle', boundary: 'circle', position: [0, 0] },
      shapes,
    );

    expect(layout.boundary.name).toBe('circle');
    expect(layout.shape.definition).toBe(shapes.get('rectangle'));
  });

  it('不传 shapes 时 layout 使用 builtin rectangle definition', () => {
    const layout = layoutOf({ type: 'node', id: 'a', position: [0, 0] });

    expect(layout.shape.definition.name).toBe('rectangle');
  });

  it('传入自定义注册表时 layout 使用该表的 rectangle definition', () => {
    const customShapes = resolveShapeRegistry();
    const layout = layoutOf({ type: 'node', id: 'a', position: [0, 0] }, customShapes);

    expect(layout.shape.definition).toBe(customShapes.get('rectangle'));
  });

  it('解析后的默认边界直接驱动锚点及裁剪，无需布局解析器', () => {
    const layout = layoutOf({
      type: 'node',
      id: 'circle-boundary',
      shape: 'rectangle',
      boundary: 'circle',
      position: [0, 0],
      layout: { minimumSize: { width: 40, height: 20 } },
    });
    const toward = [100, 0] as [number, number];
    const clipped = boundaryPointOf(layout, toward, undefined);

    expect(clipped[0]).toBeGreaterThan(layout.geometry.rect.x + layout.geometry.rect.width / 2);
    expect(getOrCreateNamedAnchor(layout, 'right', undefined)).toEqual(clipped);
  });
});
