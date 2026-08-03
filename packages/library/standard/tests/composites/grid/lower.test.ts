import type { GroupPrim, IRPath, IRScope, ScenePrimitive } from '@retikz/core';

import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { createGrid, GridDefinition, lowerGrid } from '../../../src';

const findGridGroup = (primitives: ReadonlyArray<ScenePrimitive>): GroupPrim | undefined =>
  primitives.find(
    (primitive): primitive is GroupPrim =>
      primitive.type === 'group' && primitive.children.some(child => child.type === 'path'),
  );

type LoweredChild = ReturnType<typeof lowerGrid>[number];

const firstStepPosition = (child: LoweredChild): unknown => {
  if (child.type !== 'path') throw new Error('expected a path');
  const step = child.children[0];
  return 'to' in step ? step.to : undefined;
};

describe('GridDefinition', () => {
  it('lowers a uniform grid to ordered Core paths', () => {
    const lowered = lowerGrid(createGrid({ bounds: { start: [0, 0], end: [20, 10] }, spacing: 10 }));

    expect(lowered).toEqual([
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [0, 10] },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [10, 0] },
          { type: 'step', kind: 'line', to: [10, 10] },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [20, 0] },
          { type: 'step', kind: 'line', to: [20, 10] },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [20, 0] },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 10] },
          { type: 'step', kind: 'line', to: [20, 10] },
        ],
      },
    ]);
  });

  it('normalizes reversed corners independently on both axes', () => {
    const ordered = lowerGrid(createGrid({ bounds: { start: [0, 0], end: [20, 10] }, spacing: 10 }));
    const reversed = lowerGrid(createGrid({ bounds: { start: [20, 0], end: [0, 10] }, spacing: 10 }));

    expect(reversed).toEqual(ordered);
  });

  it('uses axis-specific spacing and shared line and major styles', () => {
    const lowered = lowerGrid(
      createGrid({
        bounds: { start: [0, 0], end: [25, 20] },
        spacing: { x: 10, y: 5 },
        lines: { style: { stroke: '#94a3b8', strokeWidth: 0.75 } },
        major: { every: 2, style: { strokeWidth: 2 } },
      }),
    );

    expect(lowered).toHaveLength(8);
    expect(lowered.slice(0, 3).map(firstStepPosition)).toEqual([
      [0, 0],
      [10, 0],
      [20, 0],
    ]);
    expect(lowered.slice(3).map(firstStepPosition)).toEqual([
      [0, 0],
      [0, 5],
      [0, 10],
      [0, 15],
      [0, 20],
    ]);
    expect(lowered[0]).toMatchObject({ stroke: '#94a3b8', strokeWidth: 2 });
    expect(lowered[1]).toMatchObject({ stroke: '#94a3b8', strokeWidth: 0.75 });
    expect(lowered[2]).toMatchObject({ stroke: '#94a3b8', strokeWidth: 2 });
    expect(lowered[3]).toMatchObject({ stroke: '#94a3b8', strokeWidth: 2 });
    expect(lowered[4]).toMatchObject({ stroke: '#94a3b8', strokeWidth: 0.75 });
    expect(lowered[5]).toMatchObject({ stroke: '#94a3b8', strokeWidth: 2 });
    expect(lowered[6]).toMatchObject({ stroke: '#94a3b8', strokeWidth: 0.75 });
    expect(lowered[7]).toMatchObject({ stroke: '#94a3b8', strokeWidth: 2 });
  });

  it('allows one line direction to be disabled', () => {
    const lowered = lowerGrid(
      createGrid({
        bounds: { start: [0, 0], end: [20, 10] },
        spacing: 10,
        lines: { vertical: true, horizontal: false },
      }),
    );

    expect(lowered).toHaveLength(3);
    expect(lowered.every(child => child.type === 'path')).toBe(true);
  });

  it('lowers center bounds in local coordinates inside an offset Scope', () => {
    const lowered = lowerGrid(createGrid({ bounds: { position: [10, 5], width: 20, height: 10 }, spacing: 10 }));

    expect(lowered).toHaveLength(1);
    expect(lowered[0]).toMatchObject({
      type: 'scope',
      transforms: [{ kind: 'offset-translate', of: [10, 5] }],
    });
    expect((lowered[0] as IRScope).children[0]).toEqual({
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [-10, -5] },
        { type: 'step', kind: 'line', to: [-10, 5] },
      ],
    });
  });

  it('keeps center origin local and defaults it to the local top-left corner', () => {
    const defaultOrigin = lowerGrid(
      createGrid({ bounds: { position: [30, 20], width: 25, height: 15 }, spacing: 10 }),
    )[0] as IRScope;
    const explicitOrigin = lowerGrid(
      createGrid({
        bounds: { position: [30, 20], width: 25, height: 15 },
        spacing: 10,
        origin: [0, 0],
      }),
    )[0] as IRScope;

    expect(defaultOrigin.children[0]).toMatchObject({
      children: [
        { kind: 'move', to: [-12.5, -7.5] },
        { kind: 'line', to: [-12.5, 7.5] },
      ],
    });
    expect(explicitOrigin.children[0]).toMatchObject({
      children: [
        { kind: 'move', to: [-10, -7.5] },
        { kind: 'line', to: [-10, 7.5] },
      ],
    });
  });

  it('lowers zero-width and zero-height center bounds to finite degenerate paths', () => {
    const zeroWidth = lowerGrid(
      createGrid({ bounds: { position: [10, 5], width: 0, height: 10 }, spacing: 10 }),
    )[0] as IRScope;
    const zeroHeight = lowerGrid(
      createGrid({ bounds: { position: [10, 5], width: 20, height: 0 }, spacing: 10 }),
    )[0] as IRScope;

    expect(zeroWidth.children).toHaveLength(3);
    expect(zeroHeight.children).toHaveLength(4);
    for (const scope of [zeroWidth, zeroHeight]) {
      for (const child of scope.children) {
        if (child.type !== 'path') continue;
        for (const step of (child as IRPath).children) {
          if ('to' in step && Array.isArray(step.to)) expect(step.to.every(Number.isFinite)).toBe(true);
        }
      }
    }
  });

  it('keeps major identity origin-relative when boundary insertion changes output positions', () => {
    const lowered = lowerGrid(
      createGrid({
        bounds: { start: [1, 0], end: [25, 10] },
        spacing: 10,
        origin: [0, 0],
        lines: { includeBoundary: true, style: { stroke: '#cbd5e1', strokeWidth: 0.5 } },
        major: { every: 2, style: { strokeWidth: 2 } },
      }),
    );

    expect(
      lowered.slice(0, 4).map(child => {
        if (child.type !== 'path') throw new Error('expected a path');
        const firstStep = child.children[0];
        return {
          stroke: child.stroke,
          strokeWidth: child.strokeWidth,
          from: 'to' in firstStep ? firstStep.to : undefined,
        };
      }),
    ).toEqual([
      { stroke: '#cbd5e1', strokeWidth: 0.5, from: [1, 0] },
      { stroke: '#cbd5e1', strokeWidth: 0.5, from: [10, 0] },
      { stroke: '#cbd5e1', strokeWidth: 2, from: [20, 0] },
      { stroke: '#cbd5e1', strokeWidth: 0.5, from: [25, 0] },
    ]);
  });

  it('emits an extended behind border before grid lines', () => {
    const lowered = lowerGrid(
      createGrid({
        bounds: { start: [0, 0], end: [10, 10] },
        spacing: 10,
        border: {
          padding: 2,
          order: 'behind',
          extendLines: true,
          style: { stroke: '#64748b' },
        },
      }),
    );

    expect(lowered[0]?.stroke).toBe('#64748b');
    expect(lowered[0]?.type).toBe('path');
    if (lowered[0]?.type === 'path') {
      expect(lowered[0].children.map(step => ('to' in step ? step.to : undefined))).toEqual([
        [-2, -2],
        [12, -2],
        [12, 12],
        [-2, 12],
        undefined,
      ]);
    }
    expect(lowered[1]).toMatchObject({
      children: [
        { type: 'step', kind: 'move', to: [0, -2] },
        { type: 'step', kind: 'line', to: [0, 12] },
      ],
    });
  });

  it('compiles a Cartesian center through the registered Grid definition', () => {
    const warnings: Array<string> = [];
    const scene = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [createGrid({ bounds: { position: [10, 5], width: 20, height: 10 }, spacing: 10 })],
      },
      { composites: [GridDefinition], onWarn: warning => warnings.push(warning.code) },
    ).scene;
    const group = findGridGroup(scene.primitives);

    expect(warnings).toEqual([]);
    expect(group?.transforms).toEqual([{ kind: 'translate', x: 10, y: 5 }]);
  });

  it('resolves recursive PolarPosition center references in Core', () => {
    const warnings: Array<string> = [];
    const scene = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          { type: 'node', id: 'anchor', position: [50, 40], text: 'anchor' },
          createGrid({
            bounds: {
              position: { origin: { origin: 'anchor', angle: 90, radius: 10 }, angle: 0, radius: 20 },
              width: 20,
              height: 10,
            },
            spacing: 10,
          }),
        ],
      },
      { composites: [GridDefinition], onWarn: warning => warnings.push(warning.code) },
    ).scene;
    const group = findGridGroup(scene.primitives);

    expect(warnings).toEqual([]);
    expect(group?.transforms).toEqual([{ kind: 'translate', x: 70, y: 50 }]);
  });

  it('keeps Core diagnostics for an unresolved PolarPosition center reference', () => {
    const warnings: Array<string> = [];
    compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          createGrid({
            bounds: { position: { origin: 'missing', angle: 0, radius: 20 }, width: 20, height: 10 },
            spacing: 10,
          }),
        ],
      },
      { composites: [GridDefinition], onWarn: warning => warnings.push(warning.code) },
    );

    expect(warnings).toContain('OFFSET_BASE_UNRESOLVED');
  });

  it('keeps Core diagnostics for direct Grid IR without its definition', () => {
    const warnings: Array<string> = [];
    compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [createGrid({ bounds: { start: [0, 0], end: [10, 10] }, spacing: 10 })],
      },
      { onWarn: warning => warnings.push(warning.code) },
    );

    expect(warnings).toContain('COMPOSITE_NOT_REGISTERED');
  });

  it('fails fast when unchecked corner or center IR would produce non-finite lattice indices', () => {
    expect(() =>
      lowerGrid({
        namespace: 'standard',
        type: 'grid',
        bounds: { start: [-1, -1], end: [1, 1] },
        spacing: { x: Number.MIN_VALUE, y: Number.MIN_VALUE },
        lines: { vertical: true, horizontal: true, includeBoundary: false },
      }),
    ).toThrow(/finite safe integers/i);
    expect(() =>
      lowerGrid({
        namespace: 'standard',
        type: 'grid',
        bounds: { position: [0, 0], width: 2, height: 2 },
        spacing: { x: Number.MIN_VALUE, y: Number.MIN_VALUE },
        lines: { vertical: true, horizontal: true, includeBoundary: false },
      }),
    ).toThrow(/finite safe integers/i);
  });
});
