import { describe, expect, it } from 'vitest';

import { NamespaceStack } from '../../src/compile/namespace';
import { layoutNode } from '../../src/compile/node';
import { normalizeNode } from '../../src/normalize/node';
import { BUILTIN_SHAPES, resolveShapeRegistry } from '../../src/providers/shape';

const measureText = (): { width: number; height: number; ascent: number } => ({
  width: 10,
  height: 10,
  ascent: 8,
});

describe('NodeLayout boundary / shapes', () => {
  it('未指定 boundary 时 layout.boundary 为 undefined，shapes 指向传入注册表', () => {
    const namespaceStack = new NamespaceStack();
    const shapes = resolveShapeRegistry();
    const layout = layoutNode(normalizeNode({ type: 'node', id: 'a', shape: 'rectangle', position: [0, 0] }), {
      measureText,
      namespaceStack,
      shapes,
    });
    expect(layout.boundary).toBeUndefined();
    expect(layout.shapes).toBe(shapes);
  });

  it('IR node.boundary = "circle" 时 layout.boundary 携带该值', () => {
    const namespaceStack = new NamespaceStack();
    const shapes = resolveShapeRegistry();
    const layout = layoutNode(
      normalizeNode({ type: 'node', id: 'a', shape: 'rectangle', boundary: 'circle', position: [0, 0] }),
      { measureText, namespaceStack, shapes },
    );
    expect(layout.boundary).toBe('circle');
    expect(layout.shapes).toBe(shapes);
  });

  it('不传 shapes 时 layout.shapes 回退到 BUILTIN_SHAPES', () => {
    const namespaceStack = new NamespaceStack();
    const layout = layoutNode(normalizeNode({ type: 'node', id: 'a', position: [0, 0] }), {
      measureText,
      namespaceStack,
    });
    const shapeNames = Array.from(layout.shapes.values()).map(definition => definition.name);
    expect(shapeNames.sort()).toEqual(BUILTIN_SHAPES.map(def => def.name).sort());
  });

  it('传入自定义注册表时 layout.shapes 指向该自定义表', () => {
    const namespaceStack = new NamespaceStack();
    const customShapes = resolveShapeRegistry();
    const layout = layoutNode(normalizeNode({ type: 'node', id: 'a', position: [0, 0] }), {
      measureText,
      namespaceStack,
      shapes: customShapes,
    });
    expect(layout.shapes).toBe(customShapes);
  });
});
