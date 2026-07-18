import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { IRScene, PathPrim, ScenePrimitive } from '../../src';

import {
  BUILTIN_PATH_GENERATORS,
  BUILTIN_RIBBON_WIDTH_PROFILES,
  compileToScene,
  definePathGenerator,
  defineRibbonWidthProfile,
} from '../../src';
import { flattenPrims } from '../helpers/flatten';

const scene = (children: IRScene['children']): IRScene => ({
  version: 1,
  type: 'scene',
  children,
});

const firstPathPrim = (primitives: Array<ScenePrimitive>): PathPrim => {
  const prim = flattenPrims(primitives).find((item): item is PathPrim => item.type === 'path');
  if (prim === undefined) throw new Error('Expected a path primitive.');
  return prim;
};

const commandPoint = (command: PathPrim['commands'][number]): [number, number] => {
  if (!('to' in command)) throw new Error(`Expected a point command, got ${command.kind}.`);
  return command.to;
};

describe('builtin path generator and ribbon width profile', () => {
  it('builtin_parabola_without_options', () => {
    expect(BUILTIN_PATH_GENERATORS.map(definition => definition.name)).toContain('parabola');

    const compiled = compileToScene(
      scene([
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 40] },
            {
              type: 'step',
              kind: 'generator',
              name: 'parabola',
              to: [120, 40],
              params: { control: [60, 0] },
            },
          ],
        },
      ]),
      { padding: 0 },
    );
    const prim = firstPathPrim(compiled.primitives);

    expect(prim.commands).toEqual([
      { kind: 'move', to: [0, 40] },
      { kind: 'quad', control: [60, 0], to: [120, 40] },
    ]);
  });

  it('builtin_parabola_control_target_id', () => {
    const compiled = compileToScene(
      scene([
        { type: 'coordinate', id: 'C', position: [60, 0] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 40] },
            {
              type: 'step',
              kind: 'generator',
              name: 'parabola',
              to: [120, 40],
              params: { control: { id: 'C' } },
            },
          ],
        },
      ]),
      { padding: 0 },
    );
    const prim = firstPathPrim(compiled.primitives);

    expect(prim.commands[1]).toEqual({ kind: 'quad', control: [60, 0], to: [120, 40] });
  });

  it('builtin_bulge_without_options_and_peak_midpoint', () => {
    expect(BUILTIN_RIBBON_WIDTH_PROFILES.map(definition => definition.name)).toContain('bulge');

    const compiled = compileToScene(
      scene([
        {
          type: 'path',
          kind: 'ribbon',
          ribbon: {
            width: { kind: 'profile', name: 'bulge', params: { base: 4, peak: 12 } },
            sampling: { kind: 'fixed', samples: 3 },
          },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ]),
      { padding: 0 },
    );
    const prim = firstPathPrim(compiled.primitives);

    expect(prim.commands).toEqual([
      { kind: 'move', to: [0, 2] },
      { kind: 'line', to: [5, 6] },
      { kind: 'line', to: [10, 2] },
      { kind: 'line', to: [10, -2] },
      { kind: 'line', to: [5, -6] },
      { kind: 'line', to: [0, -2] },
      { kind: 'close' },
    ]);
  });

  it('bulge_peak_equals_base_and_peak_less_than_base', () => {
    const commandsFor = (base: number, peak: number): Array<PathPrim['commands'][number]> =>
      firstPathPrim(
        compileToScene(
          scene([
            {
              type: 'path',
              kind: 'ribbon',
              ribbon: {
                width: { kind: 'profile', name: 'bulge', params: { base, peak } },
                sampling: { kind: 'fixed', samples: 3 },
              },
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [10, 0] },
              ],
            },
          ]),
          { padding: 0 },
        ).primitives,
      ).commands;

    expect(commandsFor(6, 6)[1]).toEqual({ kind: 'line', to: [5, 3] });
    expect(commandsFor(12, 4)[1]).toEqual({ kind: 'line', to: [5, 2] });
  });

  it('parabola_missing_to_and_invalid_params_throw', () => {
    expect(() =>
      compileToScene(
        scene([
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'generator', name: 'parabola', params: { control: [10, 10] } },
            ],
          },
        ]),
      ),
    ).toThrow(/parabola.*to/s);

    expect(() =>
      compileToScene(
        scene([
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'generator', name: 'parabola', to: [20, 0], params: {} },
            ],
          },
        ]),
      ),
    ).toThrow();
  });

  it('bulge_rejects_negative_base_or_peak', () => {
    expect(() =>
      compileToScene(
        scene([
          {
            type: 'path',
            kind: 'ribbon',
            ribbon: {
              width: { kind: 'profile', name: 'bulge', params: { base: -1, peak: 12 } },
            },
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [10, 0] },
            ],
          },
        ]),
      ),
    ).toThrow();

    expect(() =>
      compileToScene(
        scene([
          {
            type: 'path',
            kind: 'ribbon',
            ribbon: {
              width: { kind: 'profile', name: 'bulge', params: { base: 4, peak: -1 } },
            },
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [10, 0] },
            ],
          },
        ]),
      ),
    ).toThrow();
  });

  it('bulge_with_adaptive_sampling_and_align', () => {
    const compiled = compileToScene(
      scene([
        {
          type: 'path',
          kind: 'ribbon',
          ribbon: {
            width: { kind: 'profile', name: 'bulge', params: { base: 4, peak: 12 } },
            sampling: { kind: 'adaptive', tolerance: 5, maxSamples: 8 },
            align: 'left',
          },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [20, 0] },
          ],
        },
      ]),
      { padding: 0 },
    );
    const prim = firstPathPrim(compiled.primitives);

    expect(prim.commands.length).toBeGreaterThan(5);
    expect(commandPoint(prim.commands[0])).toEqual([0, 4]);
    const lowerStart = prim.commands.at(-2);
    expect(lowerStart).toBeDefined();
    if (lowerStart !== undefined) expect(commandPoint(lowerStart)).toEqual([0, 0]);
  });

  it('custom_duplicate_builtin_name', () => {
    const parabola = definePathGenerator({
      name: 'parabola',
      paramsSchema: z.object({}),
      generate: ({ from }) => [{ kind: 'line', to: from }],
    });
    const bulge = defineRibbonWidthProfile({
      name: 'bulge',
      widthAt: () => 4,
    });

    expect(() =>
      compileToScene(scene([{ type: 'path', children: [{ type: 'step', kind: 'move', to: [0, 0] }] }]), {
        pathGenerators: [parabola],
      }),
    ).toThrow(/duplicate path generator registration: "parabola"/);
    expect(() =>
      compileToScene(scene([{ type: 'path', children: [{ type: 'step', kind: 'move', to: [0, 0] }] }]), {
        ribbonWidthProfiles: [bulge],
      }),
    ).toThrow(/duplicate ribbon width profile registration: "bulge"/);
  });

  it('parabola_inside_scope_transform_and_with_label', () => {
    const compiled = compileToScene(
      scene([
        {
          type: 'scope',
          transforms: [{ kind: 'translate', x: 100, y: 0 }],
          children: [
            {
              type: 'path',
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                {
                  type: 'step',
                  kind: 'generator',
                  name: 'parabola',
                  to: [40, 0],
                  params: { control: [20, -20] },
                  label: { text: 'p', position: 'midway' },
                },
              ],
            },
          ],
        },
      ]),
      { padding: 0 },
    );
    const prim = firstPathPrim(compiled.primitives);

    expect(commandPoint(prim.commands[0])).toEqual([0, 0]);
    expect(prim.commands[1]).toEqual({ kind: 'quad', control: [20, -20], to: [40, 0] });
    expect(flattenPrims(compiled.primitives).some(item => item.type === 'text')).toBe(true);
  });
});
