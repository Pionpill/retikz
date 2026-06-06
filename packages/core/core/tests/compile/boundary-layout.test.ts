import { describe, expect, it } from 'vitest';
import { layoutNode } from '../../src/compile/node';
import { NameStack } from '../../src/compile/name-stack';
import { BUILTIN_SHAPES } from '../../src/shapes';

const measureText = (): { width: number; height: number; ascent: number } => ({
  width: 10,
  height: 10,
  ascent: 8,
});

describe('NodeLayout boundary / shapes', () => {
  it('未指定 boundary 时 layout.boundary 为 undefined，shapes 指向传入注册表', () => {
    const nameStack = new NameStack();
    const layout = layoutNode(
      { type: 'node', id: 'a', shape: 'rectangle', position: [0, 0] },
      measureText,
      nameStack,
      undefined,
      [],
      undefined,
      BUILTIN_SHAPES,
    );
    expect(layout.boundary).toBeUndefined();
    expect(layout.shapes).toBe(BUILTIN_SHAPES);
  });

  it('IR node.boundary = "circle" 时 layout.boundary 携带该值', () => {
    const nameStack = new NameStack();
    const layout = layoutNode(
      { type: 'node', id: 'a', shape: 'rectangle', boundary: 'circle', position: [0, 0] },
      measureText,
      nameStack,
      undefined,
      [],
      undefined,
      BUILTIN_SHAPES,
    );
    expect(layout.boundary).toBe('circle');
    expect(layout.shapes).toBe(BUILTIN_SHAPES);
  });

  it('不传 shapes 时 layout.shapes 回退到 BUILTIN_SHAPES', () => {
    const nameStack = new NameStack();
    const layout = layoutNode(
      { type: 'node', id: 'a', position: [0, 0] },
      measureText,
      nameStack,
    );
    expect(layout.shapes).toBe(BUILTIN_SHAPES);
  });

  it('传入自定义注册表时 layout.shapes 指向该自定义表', () => {
    const nameStack = new NameStack();
    const customShapes = { ...BUILTIN_SHAPES };
    const layout = layoutNode(
      { type: 'node', id: 'a', position: [0, 0] },
      measureText,
      nameStack,
      undefined,
      [],
      undefined,
      customShapes,
    );
    expect(layout.shapes).toBe(customShapes);
  });
});
