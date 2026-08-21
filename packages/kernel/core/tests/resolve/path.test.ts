import { describe, expect, it } from 'vitest';

import type { IRPathBase, IRScene, IRStep } from '../../src/schemas';

import { compileToScene } from '../../src';
import { resolvePathWithBuiltinProviders } from './path-helper';

const path = (overrides: Partial<IRPathBase> = {}): IRPathBase => ({
  type: 'path',
  children: [
    { type: 'step', kind: 'move', to: [0, 0] },
    { type: 'step', kind: 'line', to: [10, 0] },
  ],
  ...overrides,
});

const sceneWith = (pathValue: IRPathBase): IRScene => ({
  version: 1,
  type: 'scene',
  children: [pathValue],
});

describe('resolvePath', () => {
  it('resolves path style defaults before compile materialization', () => {
    expect(resolvePathWithBuiltinProviders(path()).style).toEqual({
      strokeWidth: 1,
      strokeRequested: false,
      strokeFillDefault: 'none',
      strokeDefault: 'currentColor',
    });

    expect(resolvePathWithBuiltinProviders(path({ strokeWidth: 2 })).style).toEqual({
      strokeWidth: 2,
      strokeRequested: true,
      strokeFillDefault: 'none',
      strokeDefault: 'currentColor',
    });
  });

  it('expands bend and shape close defaults while preserving explicit values', () => {
    const canonical = resolvePathWithBuiltinProviders(
      path({
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'bend', to: [10, 0] },
          { type: 'step', kind: 'bend', to: [20, 0], bendDirection: 'right', bendAngle: -15 },
          { type: 'step', kind: 'circlePath', radius: 5, startAngle: 0, endAngle: 90 },
          { type: 'step', kind: 'ellipsePath', radius: { x: 5, y: 3 }, closed: 'open' },
        ],
      }),
    );

    expect(canonical.path.children![1]).toMatchObject({ kind: 'bend', bendDirection: 'left', bendAngle: 30 });
    expect(canonical.path.children![2]).toMatchObject({ kind: 'bend', bendDirection: 'right', bendAngle: -15 });
    expect(canonical.path.children![3]).toMatchObject({ kind: 'circlePath', closed: 'chord' });
    expect(canonical.path.children![4]).toMatchObject({ kind: 'ellipsePath', closed: 'open' });
  });

  it('expands fold and smooth static defaults without changing geometry inputs', () => {
    const canonical = resolvePathWithBuiltinProviders(
      path({
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'fold', via: '-|-', to: [10, 10] },
          { type: 'step', kind: 'smooth', points: [[20, 20]] },
        ],
      }),
    );

    expect(canonical.path.children![1]).toMatchObject({ kind: 'fold', fraction: 0.5 });
    expect(canonical.path.children![2]).toMatchObject({ kind: 'smooth', tension: 1 });
    expect(canonical.path.children![0]).toMatchObject({ to: [0, 0] });
  });

  it('canonicalizes every geometry label position, side, and distance', () => {
    const positions = [
      'at-start',
      'very-near-start',
      'near-start',
      'midway',
      'near-end',
      'very-near-end',
      'at-end',
    ] as const;
    const expected = [0, 0.125, 0.25, 0.5, 0.75, 0.875, 1];
    const children: Array<IRStep> = positions.map((position, index) => ({
      type: 'step' as const,
      kind: 'line' as const,
      to: [index + 1, 0] as [number, number],
      label: { text: position, position } as const,
    }));
    const canonical = resolvePathWithBuiltinProviders(
      path({ children: [{ type: 'step', kind: 'move', to: [0, 0] }, ...children] }),
    );

    for (const [index, step] of canonical.path.children!.slice(1).entries()) {
      expect(step).toMatchObject({ label: { position: expected[index], side: 'top', distance: 4 } });
    }
    expect(
      resolvePathWithBuiltinProviders(
        path({
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            {
              type: 'step',
              kind: 'line',
              to: [1, 0],
              label: { text: 'inside', placement: 'inside', sloped: true },
            },
          ],
        }),
      ).path.children![1],
    ).toMatchObject({ label: { position: 0.5, side: 'center', distance: 4 } });
  });

  it('normalizes a host label to an array while preserving explicit falsy values', () => {
    const canonical = resolvePathWithBuiltinProviders(
      path({ label: { text: 'host', position: 'at-end', side: 'bottom', distance: 0, sloped: false } }),
    );

    expect(canonical.path.label).toEqual([{ text: 'host', position: 1, side: 'bottom', distance: 0, sloped: false }]);
  });

  it('compiles compact Path forms to the same Scene as their explicit Source IR equivalents', () => {
    const compact = path({
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        {
          type: 'step',
          kind: 'fold',
          via: '-|-',
          to: [10, 10],
          label: { text: 'fold', position: 'at-end' },
        },
        { type: 'step', kind: 'smooth', points: [[20, 20]], label: { text: 'smooth' } },
      ],
    });
    const expanded = path({
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        {
          type: 'step',
          kind: 'fold',
          via: '-|-',
          fraction: 0.5,
          to: [10, 10],
          label: { text: 'fold', position: 1, side: 'top', distance: 4 },
        },
        {
          type: 'step',
          kind: 'smooth',
          points: [[20, 20]],
          tension: 1,
          label: { text: 'smooth', position: 0.5, side: 'top', distance: 4 },
        },
      ],
    });

    expect(compileToScene(sceneWith(compact)).scene).toEqual(compileToScene(sceneWith(expanded)).scene);
  });

  it('compiles compact bend and partial-shape defaults like their explicit forms', () => {
    const compact = path({
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'bend', to: [10, 0] },
        { type: 'step', kind: 'circlePath', radius: 5, startAngle: 0, endAngle: 90 },
        { type: 'step', kind: 'ellipsePath', radius: { x: 6, y: 3 }, startAngle: 0, endAngle: 180 },
      ],
    });
    const expanded = path({
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'bend', to: [10, 0], bendDirection: 'left', bendAngle: 30 },
        { type: 'step', kind: 'circlePath', radius: 5, startAngle: 0, endAngle: 90, closed: 'chord' },
        {
          type: 'step',
          kind: 'ellipsePath',
          radius: { x: 6, y: 3 },
          startAngle: 0,
          endAngle: 180,
          closed: 'chord',
        },
      ],
    });

    expect(compileToScene(sceneWith(compact)).scene).toEqual(compileToScene(sceneWith(expanded)).scene);
  });
});
