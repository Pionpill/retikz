import { describe, expect, it } from 'vitest';

import type { StyleResolveFrame } from '../../src/resolve/style';
import type { IRNode, IRScene } from '../../src/schemas';

import { compileToScene } from '../../src/compile/compile';
import { resolveBoundaryRegistry } from '../../src/providers/boundary';
import { resolvePatternRegistry } from '../../src/providers/pattern';
import { resolveShapeRegistry } from '../../src/providers/shape';
import { resolveNode } from '../../src/resolve/node';
import { createStyleResolveFrame } from '../../src/resolve/style';

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

const resolve = (source: IRNode, styleFrames: ReadonlyArray<StyleResolveFrame> = []) =>
  resolveNode(source, {
    styleFrames,
    shapes: resolveShapeRegistry(),
    boundaries: resolveBoundaryRegistry(),
    patterns: resolvePatternRegistry(),
    round: value => value,
    irPath: 'node',
    warn: () => {},
  });

describe('resolveNode', () => {
  it('expands numeric and CSS-like box spacing while preserving explicit zero', () => {
    expect(resolve(node({ padding: 3, margin: { y: 5, bottom: 0 } })).node).toMatchObject({
      padding: { top: 3, right: 3, bottom: 3, left: 3 },
      margin: { top: 5, right: 0, bottom: 0, left: 0 },
    });

    expect(resolve(node({ padding: { default: 2, x: 4, left: 1 } })).node.padding).toEqual({
      top: 2,
      right: 4,
      bottom: 2,
      left: 1,
    });
  });

  it('expands node size and scale shorthand while preserving explicit zero', () => {
    expect(resolve(node({ minimumSize: 12, scale: 2 })).node).toMatchObject({
      minimumSize: { width: 12, height: 12 },
      scale: { x: 2, y: 2 },
    });

    expect(resolve(node({ minimumSize: { default: 10, width: 0 }, scale: { default: 3, y: 1 } })).node).toMatchObject({
      minimumSize: { width: 0, height: 10 },
      scale: { x: 3, y: 1 },
    });
  });

  it('supplies Node defaults without changing unrelated IR fields', () => {
    const source = node({ id: 'node-a', text: 'A' });

    expect(resolve(source).node).toEqual({
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

  it('canonicalizes text shorthand without dropping an empty string or reordering lines', () => {
    expect(resolve(node({ text: '' })).node.text).toEqual(['']);

    const lines: NonNullable<IRNode['text']> = ['first', { text: 'second' }];
    expect(resolve(node({ text: lines })).node.text).toEqual(lines);
  });

  it('materializes effective label defaults into every canonical label', () => {
    const frame = createStyleResolveFrame({
      type: 'scope',
      children: [],
      color: 'red',
      labelDefault: {
        textColor: 'blue',
        opacity: 0.5,
        font: { family: 'default', size: 20, weight: 'bold' },
      },
    });
    const resolved = resolve(node({ label: { text: 'x', font: { size: 10 } } }), [frame]).node;

    expect(resolved.label).toEqual([
      {
        text: 'x',
        position: 'top',
        placement: 'outside',
        textColor: 'blue',
        opacity: 0.5,
        font: { family: 'default', size: 10, weight: 'bold' },
      },
    ]);
  });

  it('fills canonical label defaults without replacing explicit zero or false values', () => {
    expect(resolve(node({ label: { text: 'default' } })).node.label).toEqual([
      { text: 'default', position: 'top', placement: 'outside' },
    ]);

    expect(
      resolve(
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
      ).node.label,
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
    expect(resolve(node({ label: { text: 'boundary', position: { boundary: 'right' } } })).node.label).toEqual([
      { text: 'boundary', position: { boundary: 'right', fraction: 0.5 }, placement: 'outside' },
    ]);
  });

  it('resolves Node scalar defaults and static dash and shadow forms', () => {
    const defaults = resolve(node()).node;
    expect(defaults.align).toBe('middle');
    expect(defaults.rotate).toBe(0);
    expect(resolve(node({ dashed: true, dotted: true })).node.dashPattern).toEqual([4, 2]);
    expect(resolve(node({ dashPattern: [0, 2], dashed: true, dotted: true })).node.dashPattern).toEqual([0, 2]);
    expect(resolve(node({ dashed: true, dotted: true })).node).not.toHaveProperty('dashed');
    expect(resolve(node({ dashed: true, dotted: true })).node).not.toHaveProperty('dotted');
    expect(resolve(node({ shadow: { offsetX: 0, offsetY: 0, opacity: 0 } })).node.shadow).toEqual({
      offsetX: 0,
      offsetY: 0,
      opacity: 0,
      color: 'rgba(0,0,0,0.5)',
    });
  });

  it('returns shape and boundary provider resolutions alongside the canonical node', () => {
    const resolved = resolve(node({ shape: 'rectangle', boundary: 'circle' }));

    expect(resolved.shape.name).toBe('rectangle');
    expect(resolved.shape.definition.name).toBe('rectangle');
    expect(resolved.boundary.name).toBe('circle');
    expect(resolved.boundary.definition.name).toBe('circle');
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

  it('compiles compact Node static forms to the same Scene as canonical IR equivalents', () => {
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
