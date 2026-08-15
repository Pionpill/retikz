import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { IRPathBase } from '../../src/schemas';

import {
  compileToScene,
  defineArrow,
  definePathGenerator,
  definePathKind,
  defineRibbonWidthProfile,
  resolveArrowRegistry,
  resolvePathGeneratorRegistry,
  resolvePathKindRegistry,
  resolveRibbonWidthProfileRegistry,
} from '../../src';
import {
  resolvePathWithBuiltinProviders,
  resolveRibbonPathWithBuiltinProviders,
  resolveStrokePathWithBuiltinProviders,
} from './path-helper';

const steps = [
  { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
  { type: 'step' as const, kind: 'line' as const, to: [10, 0] as [number, number] },
];

const path = (overrides: Partial<IRPathBase> = {}): IRPathBase => ({
  type: 'path',
  children: steps,
  ...overrides,
});

describe('resolve/path provider bindings', () => {
  it('binds builtin and custom path kind definitions and parses options once', () => {
    const custom = definePathKind({
      schema: z.object({ kind: z.literal('highlight') }),
      optionsSchema: z.strictObject({ stroke: z.string() }),
      compile: () => null,
    });
    const resolution = resolvePathWithBuiltinProviders(path({ kind: 'highlight', kindOptions: { stroke: 'gold' } }), {
      pathKinds: resolvePathKindRegistry([custom]),
    });

    expect(resolution.kind.name).toBe('highlight');
    expect(resolution.kind.definition).toBe(custom);
    expect(resolution.kind.options).toEqual({ stroke: 'gold' });
    expect(resolvePathWithBuiltinProviders(path()).kind.name).toBe('stroke');
  });

  it('fails unknown path kinds through the resolver registry diagnostic', () => {
    expect(() =>
      resolvePathWithBuiltinProviders(path({ kind: 'missing' }), { pathKinds: resolvePathKindRegistry() }),
    ).toThrow(/Unknown path kind 'missing'.*available: ribbon, stroke/s);
  });

  it('reports unknown generator, arrow, and ribbon profile names from the resolver', () => {
    expect(() =>
      resolveStrokePathWithBuiltinProviders(
        path({
          children: [steps[0], { type: 'step', kind: 'generator', name: 'missing-generator', params: {} }],
        }),
        { irPath: 'children[0].path' },
      ),
    ).toThrow(/Unknown path generator 'missing-generator'.*options\.pathGenerators/s);

    expect(() =>
      resolveStrokePathWithBuiltinProviders(
        path({ marks: [{ pos: 1, mark: { kind: 'arrow', shape: 'missing-arrow' } }] }),
        {
          irPath: 'children[0].path',
        },
      ),
    ).toThrow(/Unknown arrow shape 'missing-arrow'.*options\.arrows/s);

    expect(() =>
      resolveRibbonPathWithBuiltinProviders(
        path({
          kind: 'ribbon',
          ribbon: { width: { kind: 'profile', name: 'missing-profile' }, samples: 2 },
        }),
        { irPath: 'children[0].path' },
      ),
    ).toThrow(/Unknown ribbon width profile 'missing-profile'.*options\.ribbonWidthProfiles/s);
  });

  it('reports provider payload failures with the source IR locator', () => {
    const generator = definePathGenerator({
      name: 'locator-generator',
      paramsSchema: z.strictObject({ amount: z.number() }),
      generate: ({ from }) => [{ kind: 'line', to: from }],
    });
    expect(() =>
      resolveStrokePathWithBuiltinProviders(
        path({
          children: [steps[0], { type: 'step', kind: 'generator', name: 'locator-generator', params: {} }],
        }),
        { pathGenerators: resolvePathGeneratorRegistry([generator]), irPath: 'children[0].path' },
      ),
    ).toThrow(
      /path generator 'locator-generator' failed params validation at children\[0\]\.path\.children\[1\]\.params/s,
    );

    const profile = defineRibbonWidthProfile({
      name: 'locator-profile',
      paramsSchema: z.strictObject({ base: z.number() }),
      widthAt: ({ params }) => params.base,
    });
    expect(() =>
      resolveRibbonPathWithBuiltinProviders(
        path({
          kind: 'ribbon',
          ribbon: { width: { kind: 'profile', name: 'locator-profile', params: {} }, samples: 2 },
        }),
        { ribbonWidthProfiles: resolveRibbonWidthProfileRegistry([profile]), irPath: 'children[0].path' },
      ),
    ).toThrow(
      /ribbon width profile 'locator-profile' failed params validation at children\[0\]\.path\.ribbon\.width\.params/s,
    );
  });

  it('binds generator definitions, parsed params, and step provenance', () => {
    const generator = definePathGenerator({
      name: 'bend',
      paramsSchema: z.strictObject({ amount: z.number() }),
      generate: ({ from }) => [{ kind: 'line', to: [from[0] + 1, from[1]] }],
    });
    const resolution = resolveStrokePathWithBuiltinProviders(
      path({
        children: [steps[0], { type: 'step', kind: 'generator', name: 'bend', params: { amount: 3 } }],
      }),
      { pathGenerators: resolvePathGeneratorRegistry([generator]), irPath: 'children[0].path' },
    );
    const [generatorResolution] = [...resolution.generators.values()];

    expect(generatorResolution).toMatchObject({
      stepIndex: 1,
      name: 'bend',
      definition: generator,
      params: { amount: 3 },
      irPath: 'children[0].path.children[1]',
    });
  });

  it('binds arrow hollow visual defaults and geometry before marker emit', () => {
    const arrow = defineArrow({
      name: 'hollowProbe',
      hollow: true,
      lineContactX: 2,
      emit: () => [],
    });
    const mark = { kind: 'arrow' as const, shape: 'hollowProbe' };
    const resolution = resolveStrokePathWithBuiltinProviders(path({ marks: [{ pos: 1, mark }] }), {
      arrows: resolveArrowRegistry([arrow]),
    });
    const arrowResolution = resolution.arrows.get(mark);

    expect(arrowResolution?.definition).toBe(arrow);
    expect(arrowResolution?.visual.fill).toBeUndefined();
    expect(arrowResolution?.geometry.contactX).toBe(2 - 1.5 / 2);
    expect(arrowResolution?.geometry.shrink).toBeGreaterThan(0);
  });

  it('binds ribbon width profile params and keeps provider output validation at invocation', () => {
    const profile = defineRibbonWidthProfile({
      name: 'probe',
      paramsSchema: z.strictObject({ base: z.number() }),
      widthAt: ({ params }) => params.base,
    });
    const resolution = resolveRibbonPathWithBuiltinProviders(
      path({
        kind: 'ribbon',
        ribbon: { width: { kind: 'profile', name: 'probe', params: { base: 4 } }, samples: 2 },
      }),
      { ribbonWidthProfiles: resolveRibbonWidthProfileRegistry([profile]) },
    );

    expect(resolution.ribbonWidth).toMatchObject({ definition: profile, params: { base: 4 }, requiresSampling: true });

    const nonFinite = defineRibbonWidthProfile({ name: 'nonFinite', widthAt: () => Infinity });
    expect(
      () =>
        compileToScene(
          {
            version: 1,
            type: 'scene',
            children: [
              {
                type: 'path',
                kind: 'ribbon',
                ribbon: { width: { kind: 'profile', name: 'nonFinite' }, sampling: { kind: 'fixed', samples: 2 } },
                children: steps,
              },
            ],
          },
          { ribbonWidthProfiles: [nonFinite], padding: 0 },
        ).scene,
    ).toThrow(/Ribbon width profile "nonFinite" output validation failed/);
  });
});
