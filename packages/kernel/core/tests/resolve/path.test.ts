import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  CanonicalGeometryLabel,
  CanonicalRibbonEndpoint,
  CanonicalRibbonSampling,
  CanonicalRibbonWidth,
  CanonicalStep,
} from '../../src/resolve/path';
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
  it('exposes complete canonical step and ribbon variants to compile consumers', () => {
    expectTypeOf<Extract<CanonicalStep, { kind: 'line' }>['label']>().toEqualTypeOf<
      CanonicalGeometryLabel | undefined
    >();
    expectTypeOf<Extract<CanonicalStep, { kind: 'fold'; via: '-|-' | '|-|' }>['fraction']>().toEqualTypeOf<number>();
    expectTypeOf<Extract<CanonicalStep, { kind: 'smooth' }>['tension']>().toEqualTypeOf<number>();
    expectTypeOf<Extract<CanonicalRibbonWidth, { kind: 'stops' }>['interpolation']>().toEqualTypeOf<
      'linear' | 'smooth' | 'step'
    >();
    expectTypeOf<Extract<CanonicalRibbonSampling, { kind: 'adaptive' }>['maxSamples']>().toEqualTypeOf<number>();
    expectTypeOf<CanonicalRibbonEndpoint['cap']>().not.toEqualTypeOf<undefined>();

    const canonical = resolvePathWithBuiltinProviders(
      path({
        kind: 'ribbon',
        ribbon: {
          mode: 'boundary',
          upper: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
          lower: [
            { type: 'step', kind: 'move', to: [0, 4] },
            { type: 'step', kind: 'line', to: [10, 4] },
          ],
        },
      }),
    );
    expectTypeOf(canonical.path.ribbon?.upper).toEqualTypeOf<Array<CanonicalStep> | undefined>();
    expectTypeOf(canonical.path.ribbon?.lower).toEqualTypeOf<Array<CanonicalStep> | undefined>();
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

  it('normalizes ribbon defaults, sampling shorthand, adaptive cap, and stable width stops', () => {
    const canonical = resolvePathWithBuiltinProviders(
      path({
        kind: 'ribbon',
        ribbon: {
          width: {
            kind: 'stops',
            stops: [
              { offset: 0.75, value: 8 },
              { offset: 0.25, value: 2 },
              { offset: 0.25, value: 3 },
            ],
          },
          samples: true,
          sampling: undefined,
          start: { width: 2 },
          end: { width: 4 },
        },
      }),
    );

    expect(canonical.path.ribbon).toMatchObject({
      mode: 'centerline',
      align: 'center',
      interpolation: 'linear',
      sampling: { kind: 'fixed', samples: 64 },
      start: { width: 2, cap: 'butt' },
      end: { width: 4, cap: 'butt' },
      width: {
        kind: 'stops',
        interpolation: 'linear',
        stops: [
          { offset: 0.25, value: 2 },
          { offset: 0.25, value: 3 },
          { offset: 0.75, value: 8 },
        ],
      },
    });

    const adaptive = resolvePathWithBuiltinProviders(
      path({ kind: 'ribbon', ribbon: { width: 2, sampling: { kind: 'adaptive', tolerance: 3 } } }),
    );
    expect(adaptive.path.ribbon?.sampling).toEqual({ kind: 'adaptive', tolerance: 3, maxSamples: 512 });
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

  it('compiles compact Ribbon forms to the same Scene as their explicit Source IR equivalents', () => {
    const stops = [
      { offset: 0.75, value: 8 },
      { offset: 0.25, value: 2 },
    ];
    const compact = path({
      kind: 'ribbon',
      ribbon: { width: { kind: 'stops', stops }, samples: true },
    });
    const expanded = path({
      kind: 'ribbon',
      ribbon: {
        mode: 'centerline',
        align: 'center',
        interpolation: 'linear',
        width: { kind: 'stops', stops: [...stops].reverse(), interpolation: 'linear' },
        sampling: { kind: 'fixed', samples: 64 },
        start: { cap: 'butt' },
        end: { cap: 'butt' },
      },
    });

    expect(compileToScene(sceneWith(compact)).scene).toEqual(compileToScene(sceneWith(expanded)).scene);
  });
});
