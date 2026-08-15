import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { IRPathBase } from '../../src/schemas';

import {
  defineArrow,
  definePathGenerator,
  definePathKind,
  PathSchema,
  resolveArrowRegistry,
  resolvePathGeneratorRegistry,
  resolvePathKindRegistry,
} from '../../src';
import { resolvePathWithBuiltinProviders, resolveStrokePathWithBuiltinProviders } from './path-helper';

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
      name: 'highlight',
      schema: PathSchema.extend({
        kind: z.literal('highlight'),
        kindOptions: z.strictObject({ stroke: z.string() }),
      }),
      compile: () => null,
    });
    const resolution = resolvePathWithBuiltinProviders(path({ kind: 'highlight', kindOptions: { stroke: 'gold' } }), {
      pathKinds: resolvePathKindRegistry([custom]),
    });

    expect(resolution.kind.name).toBe('highlight');
    expect(resolution.kind.definition).toBe(custom);
    expect(resolution.kind.path.kindOptions).toEqual({ stroke: 'gold' });
    expect(resolvePathWithBuiltinProviders(path()).kind.name).toBe('stroke');
  });

  it('fails unknown path kinds through the resolver registry diagnostic', () => {
    expect(() =>
      resolvePathWithBuiltinProviders(path({ kind: 'missing' }), { pathKinds: resolvePathKindRegistry() }),
    ).toThrow(/Unknown path kind 'missing'.*available: stroke/s);
  });

  it('reports unknown generator and arrow names from the resolver', () => {
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
    const arrowResolution = resolution.arrows.get(resolution.path.marks?.[0]?.mark ?? mark);

    expect(arrowResolution?.definition).toBe(arrow);
    expect(arrowResolution?.visual.fill).toBeUndefined();
    expect(arrowResolution?.geometry.contactX).toBe(2 - 1.5 / 2);
    expect(arrowResolution?.geometry.shrink).toBeGreaterThan(0);
  });
});
