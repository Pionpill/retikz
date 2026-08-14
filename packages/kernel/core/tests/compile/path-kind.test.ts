import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { CompileWarning, IRScene, PathPrim, ScenePrimitive } from '../../src';

import {
  compileToScene,
  CompileWarningCode,
  definePathGenerator,
  definePathKind,
  defineRibbonWidthProfile,
} from '../../src';

const steps = [
  { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
  { type: 'step' as const, kind: 'line' as const, to: [100, 0] as [number, number] },
];

const scene = (children: IRScene['children']): IRScene => ({
  version: 1,
  type: 'scene',
  children,
});

const flatten = (primitives: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> => {
  const out: Array<ScenePrimitive> = [];
  for (const primitive of primitives) {
    out.push(primitive);
    if (primitive.type === 'group') out.push(...flatten(primitive.children));
  }
  return out;
};

const pathPrims = (ir: IRScene, options?: Parameters<typeof compileToScene>[1]): Array<PathPrim> =>
  flatten(compileToScene(ir, { padding: 0, ...options }).scene.primitives).filter(
    (primitive): primitive is PathPrim => primitive.type === 'path',
  );

describe('Path kind registry', () => {
  it('compiles omitted kind as the built-in stroke path kind', () => {
    const [prim] = pathPrims(scene([{ type: 'path', stroke: 'crimson', children: steps }]));

    expect(prim.stroke).toBe('crimson');
    expect(prim.fill).toBe('none');
  });

  it('compiles kind=ribbon through Path with ribbon options', () => {
    const [prim] = pathPrims(
      scene([
        {
          type: 'path',
          kind: 'ribbon',
          color: 'teal',
          ribbon: { width: 10, samples: 2 },
          children: steps,
        },
      ]),
    );

    expect(prim.fill).toBe('teal');
    expect(prim.stroke).toBeUndefined();
    expect(prim.commands.at(-1)).toEqual({ kind: 'close' });
  });

  it('supports boundary ribbon as Path kind=ribbon with ribbon.mode=boundary', () => {
    const [prim] = pathPrims(
      scene([
        {
          type: 'path',
          kind: 'ribbon',
          fill: '#bfdbfe',
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
        },
      ] as IRScene['children']),
    );

    expect(prim.fill).toBe('#bfdbfe');
    expect(prim.commands.at(-1)).toEqual({ kind: 'close' });
  });

  it('throws for unknown path kinds until a provider is registered', () => {
    expect(
      () =>
        compileToScene(
          scene([{ type: 'path', kind: 'missing', kindOptions: {}, children: steps }] as IRScene['children']),
        ).scene,
    ).toThrow(/Unknown path kind 'missing'/);
  });

  it('lets custom path kinds reuse the built-in stroke emitter', () => {
    const highlight = definePathKind({
      schema: z.object({ kind: z.literal('highlight') }),
      optionsSchema: z.object({ stroke: z.string().min(1) }).strict(),
      compile: context => {
        const base = context.emitStroke(context.path);
        if (base === null) return null;
        return {
          ...base,
          primitives: base.primitives.map(primitive =>
            primitive.type === 'path' ? { ...primitive, stroke: context.options.stroke } : primitive,
          ),
        };
      },
    });

    const [prim] = pathPrims(
      scene([
        {
          type: 'path',
          kind: 'highlight',
          kindOptions: { stroke: 'gold' },
          children: steps,
        },
      ] as IRScene['children']),
      { pathKinds: [highlight] },
    );

    expect(prim.stroke).toBe('gold');
  });

  it('keeps Source shorthand visible to custom providers before emitStroke canonicalizes it', () => {
    let observedPosition: unknown;
    const sourceStroke = definePathKind({
      schema: z.object({ kind: z.literal('source-stroke') }),
      compile: context => {
        const line = context.path.children?.[1];
        observedPosition = line && 'label' in line ? line.label?.position : undefined;
        return context.emitStroke();
      },
    });
    const compiled = compileToScene(
      scene([
        {
          type: 'path',
          kind: 'source-stroke',
          children: [steps[0], { ...steps[1], label: { text: 'end', position: 'at-end' } }],
        },
      ] as IRScene['children']),
      { pathKinds: [sourceStroke], padding: 0 },
    ).scene;
    const label = flatten(compiled.primitives).find(primitive => primitive.type === 'text');

    expect(observedPosition).toBe('at-end');
    expect(label).toMatchObject({ type: 'text', x: 100 });
  });

  it('keeps Ribbon shorthand visible to custom providers before emitRibbon canonicalizes it', () => {
    let observedSamples: unknown;
    const sourceRibbon = definePathKind({
      schema: z.object({ kind: z.literal('source-ribbon') }),
      compile: context => {
        observedSamples = context.path.ribbon?.samples;
        return context.emitRibbon();
      },
    });
    const [prim] = pathPrims(
      scene([
        {
          type: 'path',
          kind: 'source-ribbon',
          ribbon: { width: 10, samples: true },
          children: steps,
        },
      ] as IRScene['children']),
      { pathKinds: [sourceRibbon] },
    );

    expect(observedSamples).toBe(true);
    expect(prim.commands.at(-1)).toEqual({ kind: 'close' });
  });

  it('keeps generator bindings when a custom kind emits a ribbon centerline', () => {
    let calls = 0;
    const generator = definePathGenerator({
      name: 'custom-ribbon-line',
      paramsSchema: z.strictObject({}),
      generate: ({ from }) => {
        calls += 1;
        return [{ kind: 'line', to: [from[0] + 20, from[1]] }];
      },
    });
    const sourceRibbon = definePathKind({
      schema: z.object({ kind: z.literal('custom-ribbon') }),
      compile: context => context.emitRibbon(),
    });
    const [prim] = pathPrims(
      scene([
        {
          type: 'path',
          kind: 'custom-ribbon',
          ribbon: { width: 10, samples: 2 },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'generator', name: 'custom-ribbon-line', params: {} },
          ],
        },
      ] as IRScene['children']),
      { pathKinds: [sourceRibbon], pathGenerators: [generator] },
    );

    expect(calls).toBe(1);
    expect(prim.commands.at(-1)).toEqual({ kind: 'close' });
  });

  it('does not resolve unused secondary providers for custom output', () => {
    const silent = definePathKind({
      schema: z.object({ kind: z.literal('silent') }),
      compile: () => null,
    });
    const direct = definePathKind({
      schema: z.object({ kind: z.literal('direct') }),
      compile: () => ({ primitives: [], boundsPoints: [] }),
    });
    const children = [
      steps[0],
      { type: 'step' as const, kind: 'generator' as const, name: 'missing-generator', params: {} },
    ];
    const source = {
      type: 'path' as const,
      children,
      marks: [{ pos: 0.5, mark: { kind: 'arrow' as const, shape: 'missing-arrow' } }],
      ribbon: { width: { kind: 'profile' as const, name: 'missing-profile' } },
    };

    expect(() =>
      compileToScene(scene([{ ...source, kind: 'silent' }] as IRScene['children']), { pathKinds: [silent] }),
    ).not.toThrow();
    expect(() =>
      compileToScene(scene([{ ...source, kind: 'direct' }] as IRScene['children']), { pathKinds: [direct] }),
    ).not.toThrow();
  });

  it('resolves only stroke providers when a custom kind emits stroke', () => {
    let generatorCalls = 0;
    const generator = definePathGenerator({
      name: 'stroke-only-generator',
      paramsSchema: z.strictObject({}),
      generate: ({ from }) => {
        generatorCalls += 1;
        return [{ kind: 'line', to: [from[0] + 10, from[1]] }];
      },
    });
    const strokeOnly = definePathKind({
      schema: z.object({ kind: z.literal('stroke-only') }),
      compile: context => context.emitStroke(),
    });

    expect(() =>
      compileToScene(
        scene([
          {
            type: 'path',
            kind: 'stroke-only',
            ribbon: { width: { kind: 'profile', name: 'missing-profile' } },
            children: [steps[0], { type: 'step', kind: 'generator', name: 'stroke-only-generator', params: {} }],
          },
        ] as IRScene['children']),
        { pathKinds: [strokeOnly], pathGenerators: [generator] },
      ),
    ).not.toThrow();
    expect(generatorCalls).toBe(1);
  });

  it('keeps custom short emitStroke ahead of secondary provider lookup', () => {
    const shortStroke = definePathKind({
      schema: z.object({ kind: z.literal('short-stroke') }),
      compile: context => context.emitStroke(),
    });
    const warnings: Array<CompileWarning> = [];
    const source = {
      type: 'path' as const,
      kind: 'short-stroke' as const,
      children: [{ type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] }],
      marks: [{ pos: 0.5, mark: { kind: 'arrow' as const, shape: 'missing-arrow' } }],
      ribbon: { width: { kind: 'profile' as const, name: 'missing-profile' } },
    };

    expect(() =>
      compileToScene(scene([source] as IRScene['children']), {
        pathKinds: [shortStroke],
        onWarn: warning => warnings.push(warning),
      }),
    ).not.toThrow();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({ code: CompileWarningCode.PathTooShort });
  });

  it('resolves ribbon generators and width profiles, but only resolves arrows for marks', () => {
    let generatorCalls = 0;
    let profileCalls = 0;
    const generator = definePathGenerator({
      name: 'ribbon-only-generator',
      paramsSchema: z.strictObject({}),
      generate: ({ from }) => {
        generatorCalls += 1;
        return [{ kind: 'line', to: [from[0] + 10, from[1]] }];
      },
    });
    const profile = defineRibbonWidthProfile({
      name: 'ribbon-only-profile',
      widthAt: () => {
        profileCalls += 1;
        return 8;
      },
    });
    const ribbonOnly = definePathKind({
      schema: z.object({ kind: z.literal('ribbon-only') }),
      compile: context => context.emitRibbon(),
    });

    expect(() =>
      compileToScene(
        scene([
          {
            type: 'path',
            kind: 'ribbon-only',
            ribbon: { width: { kind: 'profile', name: 'ribbon-only-profile' }, samples: 2 },
            children: [steps[0], { type: 'step', kind: 'generator', name: 'ribbon-only-generator', params: {} }],
          },
        ] as IRScene['children']),
        {
          pathKinds: [ribbonOnly],
          pathGenerators: [generator],
          ribbonWidthProfiles: [profile],
        },
      ),
    ).not.toThrow();
    expect(generatorCalls).toBe(1);
    expect(profileCalls).toBeGreaterThan(0);
  });

  it('lets ribbon structure guards run before secondary provider lookup', () => {
    const noRibbon = definePathKind({
      schema: z.object({ kind: z.literal('no-ribbon') }),
      compile: context => context.emitRibbon(),
    });
    expect(() =>
      compileToScene(
        scene([
          {
            type: 'path',
            kind: 'no-ribbon',
            children: [steps[0], { type: 'step', kind: 'generator', name: 'missing-generator', params: {} }],
          },
        ] as IRScene['children']),
        { pathKinds: [noRibbon] },
      ),
    ).toThrow(/requires a `ribbon` options object/i);

    const boundaryLabel = definePathKind({
      schema: z.object({ kind: z.literal('boundary-label') }),
      compile: context => context.emitRibbon(),
    });
    expect(() =>
      compileToScene(
        scene([
          {
            type: 'path',
            kind: 'boundary-label',
            label: { text: 'invalid' },
            ribbon: {
              mode: 'boundary',
              upper: [steps[0], { type: 'step', kind: 'generator', name: 'missing-generator', params: {} }],
              lower: [steps[0], steps[1]],
              width: { kind: 'profile', name: 'missing-profile' },
            },
          },
        ] as IRScene['children']),
        { pathKinds: [boundaryLabel] },
      ),
    ).toThrow(/centerline ribbon labels/i);

    const boundaryMissing = definePathKind({
      schema: z.object({ kind: z.literal('boundary-missing') }),
      compile: context => context.emitRibbon(),
    });
    expect(() =>
      compileToScene(
        scene([
          {
            type: 'path',
            kind: 'boundary-missing',
            ribbon: {
              mode: 'boundary',
              lower: [steps[0], steps[1]],
              width: { kind: 'profile', name: 'missing-profile' },
            },
          },
        ] as IRScene['children']),
        { pathKinds: [boundaryMissing] },
      ),
    ).toThrow(/requires `upper` and `lower` steps/i);

    const centerlineMissing = definePathKind({
      schema: z.object({ kind: z.literal('centerline-missing') }),
      compile: context => context.emitRibbon(),
    });
    expect(() =>
      compileToScene(
        scene([
          {
            type: 'path',
            kind: 'centerline-missing',
            ribbon: { width: { kind: 'profile', name: 'missing-profile' } },
          },
        ] as IRScene['children']),
        { pathKinds: [centerlineMissing] },
      ),
    ).toThrow(/centerline ribbon requires `children`/i);
  });

  it('keeps the no-Inspector emitStroke result free of inspection-only subject data', () => {
    const observed: Array<ReadonlyArray<string>> = [];
    const plain = definePathKind({
      schema: z.object({ kind: z.literal('plain-stroke') }),
      compile: context => {
        const result = context.emitStroke();
        if (result !== null) observed.push(Object.keys(result));
        return result;
      },
    });

    pathPrims(scene([{ type: 'path', kind: 'plain-stroke', children: steps }] as IRScene['children']), {
      pathKinds: [plain],
    });

    expect(observed).toEqual([['primitives', 'boundsPoints']]);
  });

  it('keeps custom path kind primitives in the transformed owner group', () => {
    const badge = definePathKind({
      schema: z.object({ kind: z.literal('badge') }),
      compile: () => ({
        primitives: [{ type: 'rect', x: 0, y: 0, width: 10, height: 6, fill: 'gold' }],
        boundsPoints: [
          [0, 0],
          [10, 6],
        ],
      }),
    });
    const compiled = compileToScene(
      scene([
        {
          type: 'scope',
          transforms: [{ kind: 'translate', x: 100, y: 20 }],
          children: [{ type: 'path', kind: 'badge', children: [] }],
        },
      ] as IRScene['children']),
      { pathKinds: [badge] },
    ).scene;

    expect(compiled.primitives).toHaveLength(1);
    const [group] = compiled.primitives;
    expect(group.type).toBe('group');
    if (group.type !== 'group') throw new Error('expected transformed owner group');
    expect(group.transforms).toEqual([{ kind: 'translate', x: 100, y: 20 }]);
    expect(group.children).toEqual([{ type: 'rect', x: 0, y: 0, width: 10, height: 6, fill: 'gold' }]);
  });

  it('custom_path_kind_options_error_contains_provider_and_ir_path', () => {
    const highlight = definePathKind({
      schema: z.object({ kind: z.literal('highlight') }),
      optionsSchema: z.object({ stroke: z.string().min(1) }).strict(),
      compile: context => context.emitStroke(context.path),
    });
    const ir = scene([
      {
        type: 'path',
        kind: 'highlight',
        kindOptions: { stroke: 42 },
        children: steps,
      },
    ] as IRScene['children']);

    expect(() => compileToScene(ir, { pathKinds: [highlight] }).scene).toThrow(/path kind 'highlight'/);
    expect(() => compileToScene(ir, { pathKinds: [highlight] }).scene).toThrow(/children\[0\]\.path\.kindOptions/);
  });
});
