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
      text: ['A'],
      label: undefined,
      align: 'middle',
      rotate: 0,
      dashPattern: undefined,
      shadow: undefined,
    });
  });

  it('canonicalizes text shorthand without dropping an empty string or reordering line specs', () => {
    expect(normalizeNode(node({ text: '' })).text).toEqual(['']);

    const lines: NonNullable<IRNode['text']> = ['first', { text: 'second' }];
    expect(normalizeNode(node({ text: lines })).text).toEqual(lines);
  });

  it('canonicalizes a single label and fills static label defaults without replacing explicit zero or false values', () => {
    expect(normalizeNode(node({ label: { text: 'default' } })).label).toEqual([
      { text: 'default', position: 'top', placement: 'outside' },
    ]);

    expect(
      normalizeNode(
        node({
          label: {
            text: 'explicit',
            position: { boundary: 'left', fraction: 0 },
            placement: 'inside',
            distance: 0,
            keepUpright: false,
            pin: false,
          },
        }),
      ).label,
    ).toEqual([
      {
        text: 'explicit',
        position: { boundary: 'left', fraction: 0 },
        placement: 'inside',
        distance: 0,
        keepUpright: false,
        pin: false,
      },
    ]);
  });

  it('fills the boundary label fraction when its position omits one', () => {
    expect(normalizeNode(node({ label: { text: 'boundary', position: { boundary: 'right' } } })).label).toEqual([
      { text: 'boundary', position: { boundary: 'right', fraction: 0.5 }, placement: 'outside' },
    ]);
  });

  it('resolves Node scalar defaults and static dash and shadow forms for compile consumers', () => {
    const defaults = normalizeNode(node());
    expect(defaults.align).toBe('middle');
    expect(defaults.rotate).toBe(0);
    expect(normalizeNode(node({ dashed: true, dotted: true })).dashPattern).toEqual([4, 2]);
    expect(normalizeNode(node({ dashPattern: [0, 2], dashed: true, dotted: true })).dashPattern).toEqual([0, 2]);
    expect(normalizeNode(node({ dashed: true, dotted: true }))).not.toHaveProperty('dashed');
    expect(normalizeNode(node({ dashed: true, dotted: true }))).not.toHaveProperty('dotted');
    expect(normalizeNode(node({ shadow: { offsetX: 0, offsetY: 0, opacity: 0 } })).shadow).toEqual({
      offsetX: 0,
      offsetY: 0,
      opacity: 0,
      color: 'rgba(0,0,0,0.5)',
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

  it('compiles compact Node static forms to the same Scene as their canonical IR equivalents', () => {
    const compact = node({
      text: 'A',
      label: { text: 'L' },
      dashed: true,
      shadow: { offsetX: 0, offsetY: 0, opacity: 0 },
    });
    const expanded = node({
      text: ['A'],
      label: [{ text: 'L', position: 'top', placement: 'outside' }],
      align: 'middle',
      rotate: 0,
      dashPattern: [4, 2],
      shadow: { offsetX: 0, offsetY: 0, opacity: 0, color: 'rgba(0,0,0,0.5)' },
    });

    expect(compileToScene(sceneWith(compact)).scene).toEqual(compileToScene(sceneWith(expanded)).scene);
  });
});
