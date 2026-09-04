import { describe, expect, it } from 'vitest';
import { literal, number, strictObject, string } from 'zod';

import type { IRPathBase } from '../../src/schemas';

import {
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
        kind: literal('highlight'),
        kindOptions: strictObject({ stroke: string() }),
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

  it('reports unsupported explicit interruption before a custom strict path-kind schema parses the label', () => {
    const strictRibbon = definePathKind({
      name: 'ribbon',
      schema: PathSchema.extend({
        kind: literal('ribbon'),
        label: strictObject({ text: string() }).optional(),
      }),
      compile: () => null,
    });

    expect(() =>
      resolvePathWithBuiltinProviders(path({ kind: 'ribbon', label: { text: 'unsupported', interrupt: false } }), {
        pathKinds: resolvePathKindRegistry([strictRibbon]),
      }),
    ).toThrow(/label\.interrupt.*built-in stroke path/i);
  });

  it('reports filled Stroke interruption requests at the host-array and step-label locators', () => {
    expect(() =>
      resolvePathWithBuiltinProviders(path({ fill: 'gold', label: [{ text: 'host', interrupt: true }] })),
    ).toThrow(/label\[0\]\.interrupt.*filled stroke path/i);

    expect(() =>
      resolvePathWithBuiltinProviders(
        path({
          fill: 'gold',
          children: [steps[0], { type: 'step', kind: 'line', to: [10, 0], label: { text: 'step', interrupt: true } }],
        }),
      ),
    ).toThrow(/children\[1\]\.label\.interrupt.*filled stroke path/i);

    expect(
      resolvePathWithBuiltinProviders(path({ fill: 'gold', label: { text: 'continuous', interrupt: false } })).path
        .label,
    ).toMatchObject([{ text: 'continuous', interrupt: false }]);
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
      paramsSchema: strictObject({ amount: number() }),
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
      paramsSchema: strictObject({ amount: number() }),
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
    const arrow = {
      name: 'hollowProbe',
      hollow: true,
      backX: 1,
      lineContactX: 2,
      emit: () => [],
    };
    const mark = { kind: 'arrow' as const, shape: 'hollowProbe', length: 12, scale: 2 };
    const resolution = resolveStrokePathWithBuiltinProviders(path({ marks: [{ pos: 1, mark }] }), {
      arrows: resolveArrowRegistry([arrow]),
    });
    const arrowResolution = resolution.arrows.get(resolution.path.marks?.[0]?.mark ?? mark);

    expect(arrowResolution?.definition).toBe(arrow);
    expect(arrowResolution?.visual.fill).toBeUndefined();
    expect(arrowResolution?.visual).toMatchObject({ length: 12, scale: 2, width: 8 });
    expect(arrowResolution?.geometry.contactX).toBe(2 - 1.5 / 2);
    expect(arrowResolution?.geometry).toHaveProperty('visualBackX', 1 - 1.5 / 2);
    expect(arrowResolution?.geometry.resolvedLength).toBe(24);
    expect(arrowResolution?.geometry.shrink).toBeGreaterThan(0);
  });

  it.each([
    {
      name: 'non-finite back',
      definition: { backX: Number.NaN, lineContactX: 2, tipX: 8 },
      expected: /non-finite backX/i,
    },
    {
      name: 'back after contact',
      definition: { backX: 3, lineContactX: 2, tipX: 8 },
      expected: /backX.*lineContactX.*tipX/i,
    },
    {
      name: 'contact after tip',
      definition: { backX: 1, lineContactX: 9, tipX: 8 },
      expected: /backX.*lineContactX.*tipX/i,
    },
  ])('rejects invalid arrow geometry: $name', ({ definition, expected }) => {
    const arrow = {
      name: 'invalidGeometry',
      ...definition,
      emit: () => [],
    };

    expect(() =>
      resolveStrokePathWithBuiltinProviders(
        path({ marks: [{ pos: 1, mark: { kind: 'arrow', shape: 'invalidGeometry' } }] }),
        { arrows: resolveArrowRegistry([arrow]) },
      ),
    ).toThrow(expected);
  });

  it('rejects a non-finite resolved visual back before compile consumes it', () => {
    const arrow = {
      name: 'overflowBack',
      backX: -Number.MAX_VALUE,
      lineContactX: 0,
      tipX: 1,
      outerInset: Number.MAX_VALUE,
      defaultLength: 0.1,
      emit: () => [],
    };

    expect(() =>
      resolveStrokePathWithBuiltinProviders(
        path({ marks: [{ pos: 1, endpointOverlap: 0, mark: { kind: 'arrow', shape: arrow.name } }] }),
        { arrows: resolveArrowRegistry([arrow]) },
      ),
    ).toThrow(/resolved visual back.*non-finite/i);
  });
});
