import { NonBlankStringSchema } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';
import { literal, strictObject } from 'zod';

import type { CompileWarning, IRScene, PathPrim, ScenePrimitive } from '../../src';

import { compileToScene, CompileWarningCode, definePathGenerator, definePathKind, PathSchema } from '../../src';

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

const customPathSchema = <TKind extends string>(kind: TKind) => PathSchema.extend({ kind: literal(kind) });

describe('Path kind registry', () => {
  it('compiles omitted kind as the built-in stroke path kind', () => {
    const [prim] = pathPrims(scene([{ type: 'path', stroke: 'crimson', children: steps }]));

    expect(prim.stroke).toBe('crimson');
    expect(prim.fill).toBe('none');
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
      name: 'highlight',
      schema: PathSchema.extend({
        kind: literal('highlight'),
        kindOptions: strictObject({ stroke: NonBlankStringSchema }),
      }),
      compile: context => {
        const base = context.emitStroke(context.path);
        if (base === null) return null;
        return {
          ...base,
          primitives: base.primitives.map(primitive =>
            primitive.type === 'path' ? { ...primitive, stroke: context.path.kindOptions.stroke } : primitive,
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
      name: 'source-stroke',
      schema: customPathSchema('source-stroke'),
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

  it('does not resolve unused secondary providers for custom output', () => {
    const silent = definePathKind({
      name: 'silent',
      schema: customPathSchema('silent'),
      compile: () => null,
    });
    const direct = definePathKind({
      name: 'direct',
      schema: customPathSchema('direct'),
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
    };

    expect(() =>
      compileToScene(scene([{ ...source, kind: 'silent' }] as IRScene['children']), { pathKinds: [silent] }),
    ).not.toThrow();
    expect(() =>
      compileToScene(scene([{ ...source, kind: 'direct' }] as IRScene['children']), { pathKinds: [direct] }),
    ).not.toThrow();
  });

  it('rejects endpoint arrow overlap before a custom path kind provider can consume it', () => {
    const custom = definePathKind({
      name: 'custom-overlap',
      schema: customPathSchema('custom-overlap'),
      compile: () => ({ primitives: [], boundsPoints: [] }),
    });
    const input = scene([
      {
        type: 'path',
        kind: 'custom-overlap',
        marks: [{ pos: 1, endpointOverlap: 0.5, mark: { kind: 'arrow' } }],
        children: steps,
      },
    ]);

    expect(() => compileToScene(input, { pathKinds: [custom] })).toThrow(
      /children\[0\]\.path\.marks\[0\]\.endpointOverlap.*built-in Stroke path/,
    );
  });

  it('resolves only stroke providers when a custom kind emits stroke', () => {
    let generatorCalls = 0;
    const generator = definePathGenerator({
      name: 'stroke-only-generator',
      paramsSchema: strictObject({}),
      generate: ({ from }) => {
        generatorCalls += 1;
        return [{ kind: 'line', to: [from[0] + 10, from[1]] }];
      },
    });
    const strokeOnly = definePathKind({
      name: 'stroke-only',
      schema: customPathSchema('stroke-only'),
      compile: context => context.emitStroke(),
    });

    expect(() =>
      compileToScene(
        scene([
          {
            type: 'path',
            kind: 'stroke-only',
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
      name: 'short-stroke',
      schema: customPathSchema('short-stroke'),
      compile: context =>
        context.emitStroke({
          ...context.path,
          kind: 'stroke',
          children: context.path.children?.slice(0, 1),
        }),
    });
    const warnings: Array<CompileWarning> = [];
    const source = {
      type: 'path' as const,
      kind: 'short-stroke' as const,
      children: [
        { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
        { type: 'step' as const, kind: 'line' as const, to: [10, 0] as [number, number] },
      ],
      marks: [{ pos: 0.5, mark: { kind: 'arrow' as const, shape: 'missing-arrow' } }],
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

  it('keeps the no-Inspector emitStroke result free of inspection-only subject data', () => {
    const observed: Array<ReadonlyArray<string>> = [];
    const plain = definePathKind({
      name: 'plain-stroke',
      schema: customPathSchema('plain-stroke'),
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
      name: 'badge',
      schema: customPathSchema('badge'),
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
          children: [
            {
              type: 'path',
              kind: 'badge',
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [10, 0] },
              ],
            },
          ],
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
      name: 'highlight',
      schema: PathSchema.extend({
        kind: literal('highlight'),
        kindOptions: strictObject({ stroke: NonBlankStringSchema }),
      }),
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
    expect(() => compileToScene(ir, { pathKinds: [highlight] }).scene).toThrow(
      /children\[0\]\.path\.kindOptions\.stroke/,
    );
  });
});
