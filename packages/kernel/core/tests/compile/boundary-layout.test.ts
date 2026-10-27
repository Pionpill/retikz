import { describe, expect, it, vi } from 'vitest';

import {
  boundaryPointOf,
  createNodeGeometryContext,
  compileNodeResolution,
  nodeReferenceViewOf,
} from '../../src/compile/node';
import { createPositionResolveContext } from '../../src/compile/orchestration/position-context';
import { resolveAnchor } from '../../src/compile/reference';
import { composeScopeTransform, projectLayoutWithTransform } from '../../src/compile/transform';
import { resolveBoundaryRegistry } from '../../src/providers/boundary';
import { resolvePatternRegistry } from '../../src/providers/pattern';
import { resolveShapeRegistry } from '../../src/providers/shape';
import { resolveNode } from '../../src/resolve/node';

const measureText = (): { width: number; height: number; ascent: number } => ({
  width: 10,
  height: 10,
  ascent: 8,
});

const layoutOf = (source: Parameters<typeof resolveNode>[0], shapes = resolveShapeRegistry()) => {
  const boundaries = resolveBoundaryRegistry();
  const resolution = resolveNode(source, {
    scopeDefaults: {},
    mode: 'light',
    shapes,
    boundaries,
    patterns: resolvePatternRegistry(),
    round: value => value,
    irPath: 'node',
    warn: () => {},
    labelDistance: 12,
  });

  return compileNodeResolution(resolution, {
    measureText,
    positionContext: createPositionResolveContext({ lookupReference: () => undefined, nodeDistance: 24 }),
  }).layout;
};

describe('CompiledNodeLayout 边界/形状', () => {
  it('连接面消费上下文在布局投影和引用视图间共享缓存，并区分几何位置', () => {
    const shapes = new Map(resolveShapeRegistry());
    const rectangle = shapes.get('rectangle')!;
    const envelope = vi.fn(() => ({ halfWidth: 30, halfHeight: 30 }));
    shapes.set('rectangle', { ...rectangle, computeConnectionEnvelope: envelope });
    const layout = layoutOf({ type: 'node', position: [0, 0], boundary: 'circle' }, shapes);
    const context = createNodeGeometryContext();
    const projected = projectLayoutWithTransform(layout, composeScopeTransform([]));
    const reference = nodeReferenceViewOf(projected, context);
    const first = boundaryPointOf(layout, [100, 0], 'circle', undefined, undefined, context.get(layout));
    expect(boundaryPointOf(reference, [100, 0], 'circle', undefined, undefined, context.get(reference))).toEqual(first);
    expect(envelope).toHaveBeenCalledTimes(1);

    const moved = projectLayoutWithTransform(layout, composeScopeTransform([{ kind: 'translate', x: 10, y: 0 }]));
    expect(boundaryPointOf(moved, [100, 0], 'circle', undefined, undefined, context.get(moved))[0]).toBe(first[0] + 10);
    expect(envelope).toHaveBeenCalledTimes(2);
  });

  it('同一节点变换后的 tight fallback 警告只发一次，不同编译上下文独立', () => {
    const shapes = new Map(resolveShapeRegistry());
    shapes.set('rectangle', { ...shapes.get('rectangle')!, computeConnectionEnvelope: undefined });
    const layout = layoutOf({ type: 'node', position: [0, 0], boundary: 'circle' }, shapes);
    const warn = vi.fn();
    const context = createNodeGeometryContext();
    context.get(layout).warn = warn;
    const moved = projectLayoutWithTransform(layout, composeScopeTransform([{ kind: 'translate', x: 10, y: 0 }]));
    boundaryPointOf(layout, [100, 0], 'circle', undefined, undefined, context.get(layout));
    boundaryPointOf(moved, [100, 0], 'circle', undefined, undefined, context.get(moved));
    expect(warn).toHaveBeenCalledTimes(1);

    const another = createNodeGeometryContext();
    another.get(layout).warn = warn;
    boundaryPointOf(layout, [100, 0], 'circle', undefined, undefined, another.get(layout));
    expect(warn).toHaveBeenCalledTimes(2);
  });
  it('未指定 boundary 时 layout.boundary 为 undefined，shapes 指向传入注册表', () => {
    const shapes = resolveShapeRegistry();
    const layout = layoutOf({ type: 'node', id: 'a', shape: 'rectangle', position: [0, 0] }, shapes);

    expect(layout.boundarySource).toBeUndefined();
    expect(layout.shape.definition).toBe(shapes.get('rectangle'));
  });

  it('IR node.boundary = "circle" 时 layout.boundary 携带该值', () => {
    const shapes = resolveShapeRegistry();
    const layout = layoutOf(
      { type: 'node', id: 'a', shape: 'rectangle', boundary: 'circle', position: [0, 0] },
      shapes,
    );

    expect(layout.boundarySource).toBe('circle');
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
    const clipped = boundaryPointOf(layout, toward, layout.boundarySource);

    expect(clipped[0]).toBeGreaterThan(layout.geometry.rect.x + layout.geometry.rect.width / 2);
    expect(resolveAnchor(layout, 'right', layout.boundarySource)).toEqual(clipped);
  });
});
