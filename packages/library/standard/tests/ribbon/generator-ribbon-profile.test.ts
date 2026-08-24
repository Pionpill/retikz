import type { IRScene, PathPrim, ScenePrimitive } from '@retikz/core';

import { BUILTIN_PATH_GENERATORS, compileToScene as compileCoreToScene, definePathGenerator } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { object } from 'zod';

import type { RibbonWidthProfileDefinition } from '../../src/ribbon';

import {
  BUILTIN_RIBBON_WIDTH_PROFILES,
  createRibbonPathKindDefinition,
  defineRibbonWidthProfile,
  RibbonPathKindDefinition,
} from '../../src/ribbon';

const scene = (children: IRScene['children']): IRScene => ({
  version: 1,
  type: 'scene',
  children,
});

const flattenPrims = (primitives: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  primitives.flatMap(primitive =>
    primitive.type === 'group' ? [primitive, ...flattenPrims(primitive.children)] : [primitive],
  );

const firstPathPrim = (primitives: Array<ScenePrimitive>): PathPrim => {
  const prim = flattenPrims(primitives).find((item): item is PathPrim => item.type === 'path');
  if (prim === undefined) throw new Error('Expected a path primitive.');
  return prim;
};

const commandPoint = (command: PathPrim['commands'][number]): [number, number] => {
  if (!('to' in command)) throw new Error(`Expected a point command, got ${command.kind}.`);
  return command.to;
};

const compileToRibbonScene = (input: IRScene, options: Parameters<typeof compileCoreToScene>[1] = {}) => {
  const supplied = options.pathKinds ?? [];
  const ribbonDefinition = supplied.find(definition => definition.name === 'ribbon') ?? RibbonPathKindDefinition;
  return compileCoreToScene(input, {
    ...options,
    pathKinds: [ribbonDefinition, ...supplied.filter(definition => definition.name !== 'ribbon')],
  });
};

describe('builtin path generator and Standard Ribbon width profile', () => {
  it('Core has no builtin path generators', () => {
    expect(BUILTIN_PATH_GENERATORS).toEqual([]);
  });

  it('builtin_bulge_without_options_and_peak_midpoint', () => {
    expect(BUILTIN_RIBBON_WIDTH_PROFILES.map(definition => definition.name)).toContain('bulge');

    const compiled = compileToRibbonScene(
      scene([
        {
          type: 'path',
          kind: 'ribbon',
          kindOptions: {
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
    ).scene;
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

  it('builds the profile registry once and rejects an official-name collision at definition creation', () => {
    const duplicateBulge = defineRibbonWidthProfile({
      name: 'bulge',
      widthAt: () => 4,
    });

    expect(() => createRibbonPathKindDefinition({ profiles: [duplicateBulge] })).toThrow(/defined more than once/);
  });

  it.each(['', '   '])('rejects an invalid profile name at definition and factory entry (%j)', name => {
    expect(() => defineRibbonWidthProfile({ name, widthAt: () => 4 })).toThrow(/non-empty string/);

    const invalidProfile: RibbonWidthProfileDefinition = { name, widthAt: () => 4 };
    expect(() => createRibbonPathKindDefinition({ profiles: [invalidProfile] })).toThrow(/non-empty string/);
  });

  it('bulge_peak_equals_base_and_peak_less_than_base', () => {
    const commandsFor = (base: number, peak: number): Array<PathPrim['commands'][number]> =>
      firstPathPrim(
        compileToRibbonScene(
          scene([
            {
              type: 'path',
              kind: 'ribbon',
              kindOptions: {
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
        ).scene.primitives,
      ).commands;

    expect(commandsFor(6, 6)[1]).toEqual({ kind: 'line', to: [5, 3] });
    expect(commandsFor(12, 4)[1]).toEqual({ kind: 'line', to: [5, 2] });
  });

  it('bulge_rejects_negative_base_or_peak', () => {
    expect(
      () =>
        compileToRibbonScene(
          scene([
            {
              type: 'path',
              kind: 'ribbon',
              kindOptions: { width: { kind: 'profile', name: 'bulge', params: { base: -1, peak: 12 } } },
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [10, 0] },
              ],
            },
          ]),
        ).scene,
    ).toThrow();

    expect(
      () =>
        compileToRibbonScene(
          scene([
            {
              type: 'path',
              kind: 'ribbon',
              kindOptions: { width: { kind: 'profile', name: 'bulge', params: { base: 4, peak: -1 } } },
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [10, 0] },
              ],
            },
          ]),
        ).scene,
    ).toThrow();
  });

  it('bulge_with_adaptive_sampling_and_align', () => {
    const compiled = compileToRibbonScene(
      scene([
        {
          type: 'path',
          kind: 'ribbon',
          kindOptions: {
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
    ).scene;
    const prim = firstPathPrim(compiled.primitives);

    expect(prim.commands.length).toBeGreaterThan(5);
    expect(commandPoint(prim.commands[0])).toEqual([0, 4]);
    const lowerStart = prim.commands.at(-2);
    expect(lowerStart).toBeDefined();
    if (lowerStart !== undefined) expect(commandPoint(lowerStart)).toEqual([0, 0]);
  });

  it('custom_path_generator_is_not_reserved_by_an_empty_builtin_collection', () => {
    const generator = definePathGenerator({
      name: 'customLine',
      paramsSchema: object({}),
      generate: ({ from }) => [{ kind: 'line', to: from }],
    });
    const duplicateBulge = defineRibbonWidthProfile({
      name: 'bulge',
      widthAt: () => 4,
    });

    expect(
      () =>
        compileToRibbonScene(
          scene([
            {
              type: 'path',
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'generator', name: 'customLine', params: {} },
              ],
            },
          ]),
          { pathGenerators: [generator] },
        ).scene,
    ).not.toThrow();
    expect(
      () =>
        compileToRibbonScene(
          scene([
            {
              type: 'path',
              kind: 'ribbon',
              kindOptions: { width: { kind: 'profile', name: 'bulge', params: { base: 4, peak: 8 } } },
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [10, 0] },
              ],
            },
          ]),
          { pathKinds: [createRibbonPathKindDefinition({ profiles: [duplicateBulge] })] },
        ).scene,
    ).toThrow(/defined more than once/);
  });
});
