import { describe, expect, it } from 'vitest';

import { NamespaceStack } from '../../src/compile/namespace';
import { boundaryPointOf, layoutNode } from '../../src/compile/node';
import { resolveAnchor } from '../../src/compile/reference';
import { resolveNode } from '../../src/resolve/node';
import { resolveBoundaryRegistry } from '../../src/providers/boundary';
import { resolveShapeRegistry } from '../../src/providers/shape';

const measureText = (): { width: number; height: number; ascent: number } => ({
  width: 10,
  height: 10,
  ascent: 8,
});

const layoutOf = (source: Parameters<typeof resolveNode>[0], shapes = resolveShapeRegistry()) => {
  const boundaries = resolveBoundaryRegistry();
  const resolution = resolveNode(source, {
    styleFrames: [],
    shapes,
    boundaries,
    irPath: 'node',
    warn: () => {},
  });
  return layoutNode(resolution, { measureText, namespaceStack: new NamespaceStack() });
};

describe('NodeLayout boundary / shapes', () => {
  it('未指定 boundary 时 layout.boundary 为 undefined，shapes 指向传入注册表', () => {
    const shapes = resolveShapeRegistry();
    const layout = layoutOf({ type: 'node', id: 'a', shape: 'rectangle', position: [0, 0] }, shapes);
    expect(layout.boundary).toBeUndefined();
    expect(layout.shapeDef).toBe(shapes.get('rectangle'));
  });

  it('IR node.boundary = "circle" 时 layout.boundary 携带该值', () => {
    const shapes = resolveShapeRegistry();
    const layout = layoutOf(
      { type: 'node', id: 'a', shape: 'rectangle', boundary: 'circle', position: [0, 0] },
      shapes,
    );
    expect(layout.boundary).toBe('circle');
    expect(layout.shapeDef).toBe(shapes.get('rectangle'));
  });

  it('不传 shapes 时 layout 使用 builtin rectangle definition', () => {
    const layout = layoutOf({ type: 'node', id: 'a', position: [0, 0] });
    expect(layout.shapeDef.name).toBe('rectangle');
  });

  it('传入自定义注册表时 layout 使用该表的 rectangle definition', () => {
    const customShapes = resolveShapeRegistry();
    const layout = layoutOf({ type: 'node', id: 'a', position: [0, 0] }, customShapes);
    expect(layout.shapeDef).toBe(customShapes.get('rectangle'));
  });

  it('resolved default boundary drives anchors and clipping without a layout resolver', () => {
    const layout = layoutOf({
      type: 'node',
      id: 'circle-boundary',
      shape: 'rectangle',
      boundary: 'circle',
      minimumSize: { width: 40, height: 20 },
      position: [0, 0],
    });
    const toward = [100, 0] as [number, number];
    const clipped = boundaryPointOf(layout, toward, layout.boundary);
    expect(clipped[0]).toBeGreaterThan(layout.rect.x + layout.rect.width / 2);
    expect(resolveAnchor(layout, 'right', layout.boundary)).toEqual(clipped);
  });
});
