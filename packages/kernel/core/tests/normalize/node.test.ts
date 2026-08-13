import { describe, expect, it } from 'vitest';

import type { IRNode, IRScene } from '../../src/schemas';

import { compileToScene } from '../../src/compile/compile';
import { normalizeNode } from '../../src/normalize/node';

const node = (overrides: Partial<IRNode> = {}): IRNode => ({
  type: 'node',
  position: [0, 0],
  ...overrides,
});

const sceneWith = (child: IRNode): IRScene => ({
  type: 'scene',
  version: 1,
  children: [child],
});

describe('normalizeNode', () => {
  it('expands numeric and CSS-like box spacing while preserving explicit zero', () => {
    expect(normalizeNode(node({ padding: 3, margin: { y: 5, bottom: 0 } }))).toMatchObject({
      padding: { top: 3, right: 3, bottom: 3, left: 3 },
      margin: { top: 5, right: 0, bottom: 0, left: 0 },
    });

    expect(normalizeNode(node({ padding: { default: 2, x: 4, left: 1 } })).padding).toEqual({
      top: 2,
      right: 4,
      bottom: 2,
      left: 1,
    });
  });

  it('expands node size and scale shorthand while preserving explicit zero', () => {
    expect(normalizeNode(node({ minimumSize: 12, scale: 2 }))).toMatchObject({
      minimumSize: { width: 12, height: 12 },
      scale: { x: 2, y: 2 },
    });

    expect(normalizeNode(node({ minimumSize: { default: 10, width: 0 }, scale: { default: 3, y: 1 } }))).toMatchObject({
      minimumSize: { width: 0, height: 10 },
      scale: { x: 3, y: 1 },
    });
  });

  it('supplies the existing Node defaults without changing unrelated IR fields', () => {
    const source = node({ id: 'node-a', text: 'A' });

    expect(normalizeNode(source)).toEqual({
      ...source,
      padding: { top: 8, right: 8, bottom: 8, left: 8 },
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      minimumSize: { width: 0, height: 0 },
      scale: { x: 1, y: 1 },
    });
  });

  it('compiles compact and expanded Node forms to the same Scene', () => {
    const compact = node({
      id: 'equivalent',
      text: 'A',
      padding: { default: 2, x: 4, left: 0 },
      margin: { default: 3, y: 5, bottom: 0 },
      minimumSize: { default: 10, width: 0 },
      scale: { default: 2, y: 1 },
    });
    const expanded = node({
      id: 'equivalent',
      text: 'A',
      padding: { top: 2, right: 4, bottom: 2, left: 0 },
      margin: { top: 5, right: 3, bottom: 0, left: 3 },
      minimumSize: { width: 0, height: 10 },
      scale: { x: 2, y: 1 },
    });

    expect(compileToScene(sceneWith(compact)).scene).toEqual(compileToScene(sceneWith(expanded)).scene);
  });
});
